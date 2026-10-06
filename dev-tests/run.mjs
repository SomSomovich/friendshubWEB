#!/usr/bin/env node
/**
 * Browser harness (subphases 2.3 and 2.8).
 *
 *   node dev-tests/run.mjs            # storage layer (IndexedDB + Web Locks)
 *   node dev-tests/run.mjs e2e        # end-to-end round trip
 *
 * Neither IndexedDB nor the Web Locks API exists in Node, and shimming them
 * would test the shim instead of the storage layer, so the checks run in a real
 * engine. The harness builds the page, serves it, drives headless Edge and prints
 * the verdict the page posts back.
 *
 * The e2e mode goes through `vite preview` with a proxy: the API sends no
 * `Access-Control-Allow-Origin` for a localhost origin, so a page cannot call it
 * cross-origin, and the WebSocket upgrade needs forwarding too.
 *
 * This whole directory is intentionally not committed.
 */
import { spawn, spawnSync } from 'node:child_process'
import { capturePage } from './driver.mjs'
import { closeSync, existsSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const viteBin = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')

const STORAGE_PORT = 4291
const E2E_PORT = 4299
const E2E_RESULT_PORT = 4298
/** The e2e scenario uploads prekey pools for two devices on a slow link. */
const LONG_TIMEOUT_MS = 900_000
const SHORT_TIMEOUT_MS = 150_000
const PROFILE_DIR = join(here, '.profile')
const E2E_ENV_FILE = join(here, '.env.e2e')

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]

/**
 * Flags shared by the launches that go through `launchAndCollect` and the
 * one-shot `--dump-dom`/`--screenshot` runs.
 *
 * Not the screenshot path: `capturePage` in `driver.mjs` builds its own
 * argument list, and anything it needs has to go there.
 */
const EDGE_FLAGS = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
]

/**
 * Extra flag for a browser that has to stay alive on its own: the page reports
 * back over HTTP, so nothing would otherwise keep it (or the process) around.
 *
 * It is deliberately absent from the one-shot `--dump-dom`/`--screenshot` runs —
 * with a debugging port, Edge exits immediately and prints nothing.
 */
const EDGE_KEEP_ALIVE_FLAG = '--remote-debugging-port=0'

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
}

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' }

function findBrowser() {
  const browser = BROWSERS.find((candidate) => existsSync(candidate))
  if (!browser) {
    console.error('[harness] neither Edge nor Chrome was found in its default location')
    process.exit(1)
  }
  return browser
}

function sleep(ms) {
  return new Promise((ready) => setTimeout(ready, ms))
}

function killTree(child) {
  if (process.platform === 'win32') {
    // The browser spawns helper processes; killing only the launcher leaves them
    // holding the profile directory.
    spawnSync('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' })
    return
  }
  child.kill()
}

/**
 * Removes the profile's singleton files. They survive a hard kill, and a second
 * launch that finds them hands the URL to the (dead) previous instance and exits
 * — which looks exactly like a page that never ran.
 */
function clearProfileLocks(profileDir) {
  if (!existsSync(profileDir)) {
    return
  }
  for (const entry of readdirSync(profileDir)) {
    if (entry.startsWith('Singleton')) {
      rmSync(join(profileDir, entry), { force: true })
    }
  }
}

/** Collects the single verdict a page posts when it is done. */
function createCollector(timeoutMs) {
  let deliver = null

  return {
    deliver(body) {
      const take = deliver
      deliver = null
      if (take) {
        take(body)
      }
    },
    awaitResult() {
      return new Promise((settle) => {
        const timer = setTimeout(() => {
          deliver = null
          settle(null)
        }, timeoutMs)
        deliver = (body) => {
          clearTimeout(timer)
          settle(body)
        }
      })
    },
  }
}

function readRequestBody(request, done) {
  let body = ''
  request.on('data', (chunk) => {
    body += chunk
  })
  request.on('end', () => {
    done(body)
  })
}

/** Serves `dev-tests/` and answers the page's own-origin `POST /result`. */
async function startStaticServer(port, collector) {
  const server = createServer((request, response) => {
    const requested = new URL(request.url ?? '/', 'http://127.0.0.1')

    if (request.method === 'POST' && requested.pathname === '/result') {
      readRequestBody(request, (body) => {
        response.writeHead(204, CORS_HEADERS).end()
        collector.deliver(body)
      })
      return
    }

    const pathname = requested.pathname === '/' ? '/indexeddb.html' : requested.pathname
    const filePath = join(here, pathname)
    console.log(`  [http] ${request.method} ${pathname}`)
    if (!filePath.startsWith(here) || !existsSync(filePath)) {
      response.writeHead(404).end('not found')
      return
    }
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
    })
    response.end(readFileSync(filePath))
  })

  await new Promise((ready) => server.listen(port, '127.0.0.1', ready))
  return server
}

/** A second origin for the e2e page's verdict, since the app is served by preview. */
async function startResultServer(port, collector) {
  const server = createServer((request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(404, CORS_HEADERS).end()
      return
    }
    readRequestBody(request, (body) => {
      response.writeHead(204, CORS_HEADERS).end()
      collector.deliver(body)
    })
  })

  await new Promise((ready) => server.listen(port, '127.0.0.1', ready))
  return server
}

/** Launches the browser on `url` and waits for the page to report. */
async function launchAndCollect(browser, url, label, collector) {
  clearProfileLocks()
  const logPath = join(here, `edge-${label}.log`)
  const logHandle = openSync(logPath, 'w')
  const child = spawn(
    browser,
    [...EDGE_FLAGS, EDGE_KEEP_ALIVE_FLAG, `--user-data-dir=${PROFILE_DIR}`, url],
    { stdio: ['ignore', logHandle, logHandle] },
  )

  try {
    const body = await collector.awaitResult()

    // Edge prints its DevTools banner to stderr the moment it starts, so an
    // empty log means it never got that far — which in practice is a headless
    // instance from an interrupted run still holding the shared profile
    // directory. Without this the failure reads as "the page said nothing",
    // which sends the reader looking at the page instead of at the browser.
    if (body === null && readFileSync(logPath, 'utf8').trim().length === 0) {
      console.error(
        `[harness] the browser never started. A headless instance may still be ` +
          `holding ${PROFILE_DIR}:\n` +
          `      close any msedge processes using it, or delete that directory, ` +
          `then run again.`,
      )
    }

    return body
  } finally {
    closeSync(logHandle)
    killTree(child)
    // Give the process tree time to release the profile before the next launch.
    await sleep(1_500)
  }
}

function printVerdict(label, body) {
  if (body === null) {
    console.error(`[harness] ${label}: the page never reported a verdict`)
    return 1
  }
  const payload = JSON.parse(body)
  console.log(`--- ${label}: ${payload.total - payload.failures}/${payload.total} checks passed ---`)
  for (const line of payload.lines) {
    console.log(`  ${line}`)
  }
  return payload.failures
}

async function runStorage(browser, collector) {
  const buildExit = spawnSync(
    process.execPath,
    [viteBin, 'build', '--config', join(here, 'vite.config.ts')],
    { cwd: projectRoot, stdio: 'inherit' },
  )
  if (buildExit.status !== 0) {
    throw new Error('[harness] bundling the storage smoke entry failed')
  }

  const server = await startStaticServer(STORAGE_PORT, collector)
  let failures = 0
  try {
    for (const mode of ['write', 'verify']) {
      const body = await launchAndCollect(
        browser,
        `http://127.0.0.1:${STORAGE_PORT}/indexeddb.html#${mode}`,
        mode,
        collector,
      )
      failures += printVerdict(mode, body)
    }
  } finally {
    server.close()
  }
  return failures
}

async function waitForHttp(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.status < 500) {
        return
      }
    } catch {
      // The preview server is not listening yet.
    }
    await sleep(500)
  }
  throw new Error(
    `[harness] ${url} never became reachable.\n` +
      `      A stale preview or browser from an earlier run can hold the port; ` +
      `check dev-tests/edge-*.log and free ${E2E_PORT}.`,
  )
}

async function runE2e(browser, collector) {
  // The page's base URLs are inlined at build time, so they have to point at the
  // proxy this harness is about to start.
  await writeFile(E2E_ENV_FILE, `VITE_API_BASE=/api/v1\nVITE_WS_URL=ws://127.0.0.1:${E2E_PORT}/ws\n`)

  const buildExit = spawnSync(
    process.execPath,
    [viteBin, 'build', '--mode', 'e2e', '--config', join(here, 'e2e.vite.config.ts')],
    { cwd: projectRoot, stdio: 'inherit' },
  )
  if (buildExit.status !== 0) {
    throw new Error('[harness] bundling the e2e page failed')
  }

  const preview = spawn(
    process.execPath,
    [viteBin, 'preview', '--config', join(here, 'e2e.vite.config.ts')],
    { cwd: projectRoot, stdio: 'inherit' },
  )
  const resultServer = await startResultServer(E2E_RESULT_PORT, collector)

  try {
    await waitForHttp(`http://127.0.0.1:${E2E_PORT}/dev-tests/e2e.html`)
    const page =
      `http://127.0.0.1:${E2E_PORT}/dev-tests/e2e.html` +
      `#result=http://127.0.0.1:${E2E_RESULT_PORT}/result`
    return printVerdict('e2e', await launchAndCollect(browser, page, 'e2e', collector))
  } finally {
    resultServer.close()
    killTree(preview)
    await sleep(1_500)
    await rm(E2E_ENV_FILE, { force: true })
  }
}

/**
 * Screenshots and DOM checks of the real app, signed in.
 *
 * The API is reached through the app's own `preview` proxy, so the page is
 * same-origin for HTTP and the WebSocket; the session comes from the throwaway
 * account the smoke tests already keep, logged in for real by the seed page. The
 * app is built with `.env.harness` so its base URLs point at that proxy.
 */
const UI_PORT = 4297

/**
 * Readiness has to include the stylesheet: React paints as soon as it renders,
 * and a screenshot taken then catches the page before its CSS is applied.
 */
const STYLE_READY =
  "(document.styleSheets.length > 0 && getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)')"
const HARNESS_ENV_FILE = resolve(projectRoot, '.env.harness')

const UI_CONFIGS = [
  {
    label: 'desktop-dark-ru',
    theme: 'dark',
    lang: 'ru',
    size: '1280,800',
    expect: { emptyChats: 'Чатов пока нет', menu: 'Меню', search: 'Поиск' },
  },
  {
    label: 'mobile-light-en',
    theme: 'light',
    lang: 'en',
    size: '375,720',
    expect: { emptyChats: 'No chats yet', menu: 'Menu', search: 'Search' },
  },
]

/**
 * Launches Edge in one of its one-shot modes and returns what it printed.
 *
 * The output is captured through a file descriptor rather than `spawnSync`'s
 * `stdout`: on Windows the browser is started by a launcher process that exits
 * immediately, and its output never reaches the parent's pipe.
 */
function captureEdge(browser, url, label, extraArgs = [], profileDir = PROFILE_DIR) {
  clearProfileLocks(profileDir)
  const logPath = join(here, `.tmp/${label}.edge.log`)
  const logHandle = openSync(logPath, 'w')

  try {
    spawnSync(browser, [...EDGE_FLAGS, `--user-data-dir=${PROFILE_DIR}`, ...extraArgs, url], {
      stdio: ['ignore', logHandle, logHandle],
    })
  } finally {
    closeSync(logHandle)
  }

  return readFileSync(logPath, 'utf8')
}

/**
 * What the signed-in captures need about the smoke account: a conversation to
 * open, and a contact to search for.
 *
 * Resolved over the same proxy the page uses, with the account's own
 * credentials, so the harness never has to know an id that changes between
 * environments. Both are `null` when the account does not have one, and the
 * captures that need them are skipped rather than reported as failures.
 */
async function resolveHarnessTargets(origin, account) {
  const deviceNumber = account.deviceNumber ?? 1
  const headers = { 'X-Device-Number': String(deviceNumber) }

  try {
    const login = await fetch(`${origin}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fh_number: account.fhNumber,
        password: account.password,
        device_number: deviceNumber,
      }),
    })
    const session = await login.json()
    if (typeof session.session_token !== 'string') {
      console.warn('[harness] the account could not be signed in for the signed-in captures')
      return { conversationId: null, contactFhNumber: null, contactName: null }
    }

    const authorized = { ...headers, Authorization: `Bearer ${session.session_token}` }
    const conversations = await fetch(`${origin}/api/v1/conversations`, { headers: authorized })
      .then((response) => response.json())
    const contacts = await fetch(`${origin}/api/v1/contacts`, { headers: authorized })
      .then((response) => response.json())

    const contact = contacts.at(0)
    return {
      conversationId: conversations.find((entry) => entry.kind !== 'saved')?.id ?? null,
      contactFhNumber: contact?.fh_number ?? null,
      contactName: contact?.username ?? null,
    }
  } catch (error) {
    console.warn('[harness] could not pick a conversation to open', error)
    return { conversationId: null, contactFhNumber: null, contactName: null }
  }
}

async function runUi(browser) {
  // The screen is ready when its own content is on screen — a fixed delay would
  // race the app's IndexedDB bootstrap.
  const captures = [
    {
      label: 'login-dark-ru',
      route: '/login',
      theme: 'dark',
      lang: 'ru',
      size: '1280,800',
      ready: `document.body.innerText.includes('Вход') && ${STYLE_READY}`,
      expect: ['Вход', 'FH-номер', '<html lang="ru" data-theme="dark"'],
    },
    {
      label: 'login-light-en',
      route: '/login',
      theme: 'light',
      lang: 'en',
      size: '375,720',
      ready: `document.body.innerText.includes('Sign in') && ${STYLE_READY}`,
      expect: ['Sign in', 'FH number', '<html lang="en" data-theme="light"'],
    },
    {
      label: 'landing-dark-ru',
      route: '/',
      theme: 'dark',
      lang: 'ru',
      size: '1280,800',
      ready: `document.body.innerText.includes('Приватный мессенджер') && ${STYLE_READY}`,
      expect: ['Приватный мессенджер'],
    },
    {
      label: 'landing-light-en',
      route: '/',
      theme: 'light',
      lang: 'en',
      size: '390,844',
      ready: `document.body.innerText.includes('Private end-to-end') && ${STYLE_READY}`,
      expect: [
        'Private end-to-end encrypted messenger',
        '<html lang="en" data-theme="light"',
        'End-to-end encryption',
      ],
    },
    {
      label: 'register-dark-ru',
      route: '/register',
      theme: 'dark',
      lang: 'ru',
      size: '1280,800',
      ready: `document.body.innerText.includes('Регистрация') && ${STYLE_READY}`,
      expect: ['Регистрация', 'Минимум 8 символов'],
    },
    {
      label: 'twofactor-light-en',
      route: '/2fa',
      theme: 'light',
      lang: 'en',
      size: '390,844',
      // The screen redirects without a challenge, so one is seeded first; nothing
      // is sent anywhere until the form is submitted.
      prepare:
        "sessionStorage.setItem('fh.totpChallenge', JSON.stringify({ fhNumber: 'FH0000000', challengeToken: 'harness-challenge' }))",
      ready: `document.body.innerText.includes('Two-factor') && ${STYLE_READY}`,
      expect: ['Two-factor authentication', 'Enter the six-digit code'],
    },
    {
      // Signed out, the prepare screen has to hand the visitor to the login form.
      label: 'connect-redirect-dark-ru',
      route: '/connect',
      theme: 'dark',
      lang: 'ru',
      size: '1280,800',
      ready: `document.body.innerText.includes('Вход') && ${STYLE_READY}`,
      expect: ['FH-номер'],
    },
    {
      // The signed-in shell: the seed page logs in with the existing smoke
      // account and navigates on to /app, all inside one launch.
      label: 'app-shell-dark-ru',
      route: null,
      theme: 'dark',
      lang: 'ru',
      size: '1280,800',
      // The rows arrive with a server round trip, so the list itself is the signal.
      ready: `document.querySelector('ul') !== null && ${STYLE_READY}`,
      expect: ['Поиск', 'Меню', 'Все', 'Личные', 'Избранное', 'Тестовый собеседник'],
    },
    {
      // With no account in a fresh profile, the guard has to send this to login.
      label: 'guard-redirect-dark-ru',
      route: '/app',
      theme: 'dark',
      lang: 'ru',
      size: '1280,800',
      ready: "document.body.innerText.includes('Вход')",
      expect: ['FH-номер'],
    },
    {
      label: 'notfound-light-en',
      route: '/no-such-page',
      theme: 'light',
      lang: 'en',
      size: '375,720',
      ready: `document.body.innerText.includes('not found') && ${STYLE_READY}`,
      expect: ['Page not found'],
    },
  ]

  const accountFile = resolve(projectRoot, 'scripts/.smoke-account.json')
  if (!existsSync(accountFile)) {
    throw new Error('[harness] scripts/.smoke-account.json is missing; run npm run smoke:ws first')
  }
  const smokeAccount = JSON.parse(readFileSync(accountFile, 'utf8'))

  await mkdir(join(here, '.tmp'), { recursive: true })

  const harnessEnv = `VITE_API_BASE=/api/v1
VITE_WS_URL=ws://127.0.0.1:${UI_PORT}/ws
`
  await writeFile(HARNESS_ENV_FILE, harnessEnv)
  await writeFile(join(here, '.env.harness'), harnessEnv)

  const build = spawnSync(
    process.execPath,
    [viteBin, 'build', '--mode', 'harness', '--config', join(here, 'ui.vite.config.ts')],
    { cwd: projectRoot, stdio: 'inherit' },
  )
  if (build.status !== 0) {
    throw new Error('[harness] building the app and the seed page failed')
  }

  const preview = spawn(
    process.execPath,
    [viteBin, 'preview', '--config', join(here, 'ui.vite.config.ts')],
    { cwd: projectRoot, stdio: 'inherit' },
  )

  let failures = 0
  try {
    const origin = `http://127.0.0.1:${UI_PORT}`
    await waitForHttp(origin)

    const targets = await resolveHarnessTargets(origin, smokeAccount)
    const chatId = targets.conversationId
    // Signed in, with a couple of days of local history already stored, so the
    // transcript, its separators and the pinned banner have something to render.
    if (chatId !== null) {
      captures.push(
        {
          label: 'chat-dark-ru',
          route: null,
          next: `/app/chat/${chatId}`,
          seedChat: chatId,
          theme: 'dark',
          lang: 'ru',
          size: '1280,800',
          ready: `document.querySelector('textarea') !== null && ${STYLE_READY}`,
          expect: [
            // The identity block, taken from the contact list.
            'Тестовый собеседник',
            // The composer, the two day separators, an edit marker, a link, a
            // reaction chip, and the header's overflow menu.
            'Сообщение',
            'Сегодня',
            'Вчера',
            'изменено',
            'https://example.com/docs',
            '👍',
            'Ещё',
          ],
        },
        {
          label: 'chat-mobile-light-en',
          route: null,
          next: `/app/chat/${chatId}`,
          seedChat: chatId,
          theme: 'light',
          lang: 'en',
          size: '375,720',
          ready: `document.querySelector('textarea') !== null && ${STYLE_READY}`,
          expect: ['Тестовый собеседник', 'Message', 'Today', 'Yesterday', 'edited', 'More'],
        },
      )
    }

    // Read rather than written down: the About screen reports this value, and a
    // release should not need a second edit here to keep the check honest.
    const appVersion = JSON.parse(
      readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
    ).version

    // Settings and the profile: signed in like the chat captures, but on screens
    // whose panels each read something from the server.
    const sections = [
        { label: 'settings-dark-ru', path: '/app/settings', theme: 'dark', lang: 'ru', size: '1280,800',
          ready: 'Настройки', expect: ['Аккаунт', 'Оформление', 'Приватность', 'Безопасность', 'Уведомления', 'Аккаунты', 'О приложении'] },
        { label: 'settings-account-light-en', path: '/app/settings/account', theme: 'light', lang: 'en', size: '390,844',
          ready: 'Change avatar', expect: ['Profile', 'Change avatar', 'FH number', 'Status', 'Save status', 'Name'] },
        { label: 'settings-security-dark-ru', path: '/app/settings/security', theme: 'dark', lang: 'ru', size: '1280,800',
          ready: 'Активные сессии', expect: ['Двухфакторная аутентификация', 'Активные сессии', 'Устройства', 'Завершить все сессии'] },
        { label: 'settings-privacy-dark-ru', path: '/app/settings/privacy', theme: 'dark', lang: 'ru', size: '1280,800',
          ready: 'Заблокированные', expect: ['Невидимка', 'Исключения для присутствия', 'Заблокированные'] },
        { label: 'settings-about-light-en', path: '/app/settings/about', theme: 'light', lang: 'en', size: '390,844',
          ready: 'AGPL-3.0', expect: ['Version', appVersion, 'AGPL-3.0', 'Sign out', 'GitHub'] },
        { label: 'settings-notifications-dark-ru', path: '/app/settings/notifications', theme: 'dark', lang: 'ru', size: '1280,800',
          ready: 'Звук сообщений', expect: ['Звук сообщений', 'Системные уведомления', 'Разрешение'] },
        { label: 'profile-dark-ru', path: '/app/profile', theme: 'dark', lang: 'ru', size: '1280,800',
          ready: 'Изменить', expect: ['Профиль', 'FH-номер', 'Изменить', 'Скопировать FH-номер'] },
        { label: '2fa-light-en', path: '/app/settings/security/2fa', theme: 'light', lang: 'en', size: '390,844',
          ready: '2FA is off', expect: ['Two-factor authentication', '2FA is off', 'Turn on 2FA'] },
        { label: 'create-group-dark-ru', path: '/app/create-group', theme: 'dark', lang: 'ru', size: '1280,800',
          ready: 'Название', expect: ['Новая группа', 'Название', 'Описание', 'Ссылка-имя', 'Доступ', 'Приватный'] },
        { label: 'create-channel-light-en', path: '/app/create-channel', theme: 'light', lang: 'en', size: '390,844',
          ready: 'Handle', expect: ['New channel', 'Title', 'Handle', 'Visibility', 'Private'] },
      ]

    /**
     * Drives a wizard one step forward.
     *
     * A screenshot of step one would only prove the wizard opens, so these fill
     * the title (through the native setter React listens to, since assigning
     * `.value` alone updates nothing) and press Next, then wait for text that
     * only the second step shows. That text is what `doneText` carries.
     */
    const stepForward = (doneText, settleExpression) => `(function () {
      if (document.body.innerText.includes(${JSON.stringify(doneText)})) {
        // The next step is up; give whatever it loads from the server time to
        // arrive, or the capture shows a list that is still on its way.
        return ${settleExpression ?? 'true'}
      }
      const title = document.querySelector('input[maxlength="128"]')
      if (title !== null && title.value === '') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(title, 'Harness wizard step')
        title.dispatchEvent(new Event('input', { bubbles: true }))
        return false
      }
      const next = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Next' || b.textContent.trim() === 'Далее')
      if (next !== undefined && !next.disabled) next.click()
      return false
    })()`

    /**
     * Typing into the sidebar's search field.
     *
     * The field is a React input, so `.value` alone changes nothing — React
     * listens for the event, not the property, and the native setter is the only
     * way to make it fire. `doneText` is what proves the answer arrived, and it
     * has to be text `innerText` actually returns: a `text-transform: uppercase`
     * heading reads as "ЛЮДИ" there while the markup still says "Люди", so a
     * section label is a readiness signal that can never come true.
     */
    const typeSearch = (query, doneText) => `(function () {
      if (document.body.innerText.includes(${JSON.stringify(doneText)})) return true
      const input = document.querySelector('input[type="search"]')
      if (input === null) return false
      if (input.value !== ${JSON.stringify(query)}) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(input, ${JSON.stringify(query)})
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      return false
    })()`

    if (targets.contactFhNumber !== null) {
      captures.push({
        label: 'search-people-dark-ru',
        route: null,
        next: '/app',
        theme: 'dark',
        lang: 'ru',
        size: '1280,800',
        // The `@` prefix narrows the server's answer to exact identifiers. The
        // signal is the identifier in the result row, not the section heading:
        // see the note above about uppercased text.
        // A contact, not this account: the sidebar shows the signed-in FH number
        // and username permanently, so searching for either would let the
        // readiness check pass before any result arrived.
        ready: typeSearch(`@${targets.contactFhNumber}`, targets.contactFhNumber),
        expect: ['Люди', targets.contactFhNumber, targets.contactName],
      })
    }

    /**
     * Adding a second account, from the sign-in screen onwards.
     *
     * The regression this exists for: every screen of the sign-in flow is behind
     * a guard that turns a signed-in visitor away, and the one thing that lets
     * them through is `?add=1`. A link that dropped it did not fail loudly — it
     * silently put the visitor back on the conversation list, which is what the
     * "create an account" link used to do. So the check is end to end: start
     * where the account switcher sends you, press that link, and require the
     * registration form to be what comes up.
     *
     * The marker is the password rule, not the title or the button: the sign-in
     * screen's "create an account" link and the registration screen's submit
     * button carry the same words, so neither of those tells the two screens
     * apart.
     */
    const addAccountProbe = `(function () {
      if (document.body.innerText.includes('Минимум 8 символов')) return true
      const link = [...document.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Создать аккаунт')
      if (link === undefined) return false
      link.click()
      return false
    })()`

    captures.push(
      {
        label: 'add-account-dark-ru',
        route: null,
        next: '/login?add=1',
        theme: 'dark',
        lang: 'ru',
        size: '1280,800',
        ready: addAccountProbe,
        expect: ['Регистрация', 'Минимум 8 символов'],
      },
      {
        label: 'search-nothing-light-en',
        route: null,
        next: '/app',
        theme: 'light',
        lang: 'en',
        size: '390,844',
        ready: typeSearch('zzzqqqxyz', 'Nothing matches'),
        expect: ['Nothing matches'],
      },
    )

    /**
     * Picking a file, without a file picker.
     *
     * A real `File` through a real `DataTransfer` and a real `change` event, so
     * the composer's own path is what runs — the only thing faked is the dialog
     * a headless browser cannot show. Nothing is sent: the overlay is the last
     * step before an upload, which is exactly the part worth looking at.
     */
    const pickFile = (doneText) => `(function () {
      if (document.body.innerText.includes(${JSON.stringify(doneText)})) return true
      if (window.__pickedFile === true) return false
      const input = document.querySelector('input[type="file"][accept="image/*"]')
      if (input === null) return false
      window.__pickedFile = true

      const canvas = document.createElement('canvas')
      canvas.width = 8
      canvas.height = 8
      const context = canvas.getContext('2d')
      context.fillStyle = '#fc9003'
      context.fillRect(0, 0, 8, 8)
      canvas.toBlob(function (blob) {
        const file = new File([blob], 'harness.png', { type: 'image/png' })
        const transfer = new DataTransfer()
        transfer.items.add(file)
        input.files = transfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }, 'image/png')
      return false
    })()`

    if (chatId !== null) {
      captures.push({
        label: 'chat-attachment-dark-ru',
        route: null,
        next: `/app/chat/${chatId}`,
        theme: 'dark',
        lang: 'ru',
        size: '1280,800',
        ready: pickFile('Отправка файлов'),
        expect: ['Отправка файлов', 'harness.png', 'Без сжатия', 'Подпись', 'Убрать'],
      })
    }

    /**
     * The unread badge of the conversation that is open on screen.
     *
     * Opening a conversation has to clear its badge, and the row is assembled
     * from a marker read out of IndexedDB — so the assertion is not that the
     * messages are on screen (they plainly are) but that the row no longer
     * claims there is something unread. The badge is found by its accessible
     * name, which is the only stable handle a bare counter has.
     *
     * The outcome goes into a `data-` attribute on `<html>` rather than into
     * `document.title`: the dump is `outerHTML`, attributes survive it, and the
     * title is the app's to own.
     */
    const unreadProbe = `(function () {
      if (window.__unreadProbe === undefined) window.__unreadProbe = { step: 'look', since: 0 }
      const state = window.__unreadProbe
      const row = [...document.querySelectorAll('li')]
        .find((li) => li.textContent.includes('Тестовый собеседник'))
      if (row === undefined) return false
      const badge = row.querySelector('[aria-label^="Непрочитанных"]')

      // The badge has to be *seen* before the conversation is opened: a check
      // that passes because there was nothing to clear says nothing at all.
      if (state.step === 'look') {
        if (badge === null) {
          if (state.since === 0) state.since = Date.now()
          if (Date.now() - state.since > 8000) {
            document.documentElement.dataset.probe = 'unread=never-appeared'
            return true
          }
          return false
        }
        state.seen = badge.textContent.trim()
        state.step = 'opened'
        row.querySelector('[role="button"]').click()
        return false
      }

      document.documentElement.dataset.probe = badge === null
        ? 'unread=cleared'
        : 'unread=still-' + badge.textContent.trim() + '-of-' + state.seen
      return badge === null
    })()`

    /**
     * Holding the microphone and letting go.
     *
     * The press is dispatched as a real `PointerEvent` on the button, held past
     * the recorder's half-second minimum, then released on the button *as it is
     * then* — which is the whole point. A release only reaches the composer if
     * the button it was pressed on is still there to receive it.
     *
     * What comes out is written to the same `data-probe` attribute, because
     * there are three different ways this can end and the capture should say
     * which one happened.
     */
    const voiceProbe = `(function () {
      if (window.__voiceProbe === undefined) window.__voiceProbe = { step: 'press', at: 0 }
      const state = window.__voiceProbe
      const mic = () => document.querySelector('button[aria-label="Записать голосовое сообщение"]')
      const recording = () => document.body.innerText.includes('Отпустите')
      const overlay = () => document.body.innerText.includes('Отправка файлов')

      if (state.step === 'press') {
        const button = mic()
        if (button === null || button.disabled) return false
        button.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true,
          clientX: 40, clientY: 40,
        }))
        state.step = 'hold'
        state.at = Date.now()
        return false
      }

      if (state.step === 'hold') {
        if (!recording() || Date.now() - state.at < 1200) return false
        const held = mic()
        if (held === null) {
          document.documentElement.dataset.probe = 'voice=mic-unmounted'
          return true
        }
        held.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true,
          clientX: 40, clientY: 40,
        }))
        state.step = 'released'
        state.at = Date.now()
        return false
      }

      if (recording() && Date.now() - state.at < 3000) return false
      document.documentElement.dataset.probe =
        'voice=' + (recording() ? 'stuck' : 'released') + '-' + (overlay() ? 'sent' : 'nosend')
      return true
    })()`

    if (chatId !== null) {
      captures.push(
        {
          label: 'chat-unread-cleared-dark-ru',
          route: null,
          next: '/app',
          seedChat: chatId,
          // The conversation has to start unread, or the check has nothing to
          // clear and would pass whatever the code did.
          seedUnread: true,
          theme: 'dark',
          lang: 'ru',
          size: '1280,800',
          ready: unreadProbe,
          expect: ['unread=cleared'],
        },
        {
          label: 'voice-recording-dark-ru',
          route: null,
          next: `/app/chat/${chatId}`,
          seedChat: chatId,
          theme: 'dark',
          lang: 'ru',
          size: '1280,800',
          ready: voiceProbe,
          expect: ['voice=released-sent'],
        },
      )
    }

    /**
     * Pressing the video-call button in the chat header.
     *
     * A live WebRTC session cannot be established in a headless browser — there
     * is no second peer, and the ICE checks have nothing to succeed against — so
     * what this capture proves is the part that *can* be automated: the call
     * screen replaces the chat, its controls are all present, and the status
     * line says it is calling. The media path itself is a manual test; see
     * README_CALLS.md.
     *
     * The button is addressed by its accessible name, which is also the only
     * name it has — the header's call controls are icon-only.
     */
    const pressCallButton = (label) => {
      const selector = JSON.stringify(`button[aria-label="${label}"]`)
      return `(function () {
      const overlay = document.querySelector('[data-call-overlay]')
      if (overlay === null) {
        const button = document.querySelector(${selector})
        if (button === null) return false
        button.click()
        return false
      }
      // The overlay is up from the click; the media (or the reason there is
      // none) arrives a moment later, and a screenshot of the first frame would
      // show neither the local preview nor the failure.
      return overlay.querySelector('video, [role="alert"]') !== null
    })()`
    }

    if (chatId !== null) {
      captures.push({
        label: 'call-outgoing-dark-ru',
        route: null,
        next: `/app/chat/${chatId}`,
        seedChat: chatId,
        theme: 'dark',
        lang: 'ru',
        size: '1280,800',
        // The call screen is up from the moment the button is pressed, before
        // any media is acquired, which is exactly what makes this capturable.
        ready: pressCallButton('Видеозвонок'),
        expect: ['Завершить', 'Динамик', 'Вызов'],
      })
    }

    /**
     * The notices the shell owns.
     *
     * Both need something the page cannot do by itself: the offline strip reads
     * `navigator.onLine` before the app boots, and the install banner waits for
     * an event only a browser that can install will ever fire. `preload` is what
     * makes either true in the captured document.
     */
    captures.push(
      {
        label: 'offline-banner-dark-ru',
        route: null,
        next: '/app',
        theme: 'dark',
        lang: 'ru',
        size: '1280,800',
        preload: `Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false })`,
        ready: `document.body.innerText.includes('Вы офлайн') && ${STYLE_READY}`,
        expect: ['Вы офлайн', 'Сообщения отправятся'],
      },
      {
        label: 'install-banner-light-en',
        route: null,
        next: '/app',
        theme: 'light',
        lang: 'en',
        size: '390,844',
        preload: `window.addEventListener('load', () => {
          setTimeout(() => { window.dispatchEvent(new Event('beforeinstallprompt')) }, 300)
        })`,
        ready: `document.body.innerText.includes('Install FriendsHub') && ${STYLE_READY}`,
        expect: ['Install FriendsHub as an app', 'Install', 'Opens in its own window'],
      },
      {
        label: 'push-prompt-dark-ru',
        route: null,
        next: '/app',
        theme: 'dark',
        lang: 'ru',
        size: '1280,800',
        // The one capture that wants the one-time prompt.
        prepare: `window.localStorage.removeItem('fh.pushPromptShown')`,
        ready: `document.body.innerText.includes('Уведомления о сообщениях') && ${STYLE_READY}`,
        expect: ['Уведомления о сообщениях', 'Разрешить', 'Не сейчас'],
      },
      {
        label: 'create-group-members-dark-ru',
        route: null,
        next: '/app/create-group',
        theme: 'dark',
        lang: 'ru',
        size: '1280,800',
        ready: stepForward(
          'Необязательно: группу можно создать пустой',
          // A row of the picker, or the message that says there is none.
          "document.querySelector('main [aria-pressed]') !== null || document.body.innerText.includes('Контактов пока нет')",
        ),
        expect: ['Участники', 'Поиск по контактам', 'Тестовый собеседник', 'Необязательно'],
      },
      {
        label: 'create-channel-discussion-dark-ru',
        route: null,
        next: '/app/create-channel',
        theme: 'dark',
        lang: 'ru',
        size: '1280,800',
        ready: stepForward('Необязательно: группа, где читатели смогут комментировать.'),
        // "Link an existing one" only appears once the account has a group; the
        // smoke account has none, so it is not expected here.
        expect: ['Группа для обсуждений', 'Без обсуждений', 'Создать новую'],
      },
    )

    /**
     * The enrollment QR, as far as it can be checked without a decoder.
     *
     * The ready expression starts the enrollment (which creates a pending secret
     * and enables nothing) and then inspects the canvas the screen drew: the
     * size, that the corner is light — a quiet zone, so the code is dark on
     * white and not inverted — and that a plausible share of pixels are dark.
     * That catches a blank or inverted canvas and a wrong element size.
     *
     * It does not check that the pattern *decodes*. This browser exposes no
     * `BarcodeDetector`, and the only other decoder available would be the
     * library that drew it, which proves nothing. The content is trusted to
     * `qrcode`, which is exactly why a mature library was chosen over a
     * hand-rolled encoder here.
     */
    const QR_PROBE = `(function () {
      const canvas = document.querySelector('canvas')
      if (canvas === null) {
        const start = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Turn on 2FA'))
        if (start) start.click()
        return false
      }
      const context = canvas.getContext('2d')
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = data.length / 4
      let dark = 0
      let opaque = true
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) opaque = false
        if (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 < 128) dark += 1
      }
      const corner = data[0]
      const fraction = dark / pixels
      const sane = canvas.width === 200 && canvas.height === 200 && opaque && corner > 200 && fraction > 0.2 && fraction < 0.7
      document.title = (sane ? 'QR SANE' : 'QR BAD') + ' ' + canvas.width + 'x' + canvas.height + ' corner=' + corner + ' dark=' + fraction.toFixed(3)
      return true
    })()`

    captures.push({
        label: '2fa-qr-light-en',
        route: null,
        next: '/app/settings/security/2fa',
        theme: 'light',
        lang: 'en',
        size: '390,844',
        ready: QR_PROBE,
        expect: ['QR SANE', 'Key for manual entry'],
      })

    for (const section of sections) {
      captures.push({
        label: section.label,
        route: null,
        next: section.path,
        theme: section.theme,
        lang: section.lang,
        size: section.size,
        ready:
          `document.body.innerText.includes(${JSON.stringify(section.ready)})` +
          // Every panel that reads from the server is done: a screenshot taken
          // while one of them is still spinning proves nothing about it.
          ` && document.querySelector('[role="status"]') === null && ${STYLE_READY}`,
        expect: section.expect,
      })
    }

    const only = process.argv[3]
    const selected = captures.filter((capture) => only === undefined || capture.label.includes(only))

    for (const capture of selected) {
      const screenshotPath = join(here, '.tmp', `${capture.label}.png`)
      // A null route means the signed-in shell: the seed page logs in with the
      // existing smoke account and navigates on to /app itself.
      const seedParams = new URLSearchParams({
        result: `http://127.0.0.1:${E2E_RESULT_PORT}/result`,
        fh: smokeAccount.fhNumber,
        password: smokeAccount.password,
        device: String(smokeAccount.deviceNumber ?? 1),
        theme: capture.theme,
        lang: capture.lang,
        next: `${origin}${capture.next ?? '/app'}`,
      })
      if (capture.seedChat !== undefined) {
        seedParams.set('seedChat', capture.seedChat)
      }
      if (capture.seedUnread === true) {
        seedParams.set('seedUnread', '1')
      }
      const targetUrl =
        capture.route === null
          ? `${origin}/dev-tests/seed.html#${seedParams.toString()}`
          : `${origin}${capture.route}`

      const result = await capturePage({
        browser,
        url: targetUrl,
        profileDir: join(here, '.tmp', `profile-${capture.label}`),
        windowSize: capture.size,
        readyExpression: capture.ready,
        screenshotPath,
        prepare: [
          `localStorage.setItem('fh.theme', '${capture.theme}')`,
          `localStorage.setItem('fh.lang', '${capture.lang}')`,
          // The notification prompt is a one-time modal, and a modal over every
          // screenshot would hide the screen the capture is about. The capture
          // that tests it asks for it back by name.
          `localStorage.setItem('fh.pushPromptShown', '1')`,
          capture.prepare,
        ]
          .filter((part) => part !== undefined)
          .join(';'),
        preload: capture.preload,
      })

      await writeFile(screenshotPath, Buffer.from(result.screenshot ?? '', 'base64'))
      await writeFile(join(here, '.tmp', `${capture.label}.html`), result.dom)

      console.log(`--- ${capture.label} ---${result.ready ? '' : ' (screen never became ready)'}`)
      for (const expected of capture.expect) {
        const passed = result.dom.includes(expected)
        console.log(`  ${passed ? 'PASS' : 'FAIL'} contains "${expected}"`)
        if (!passed) {
          failures += 1
        }
      }
    }

    return failures
  } finally {
    killTree(preview)
    await sleep(1_500)
    await rm(HARNESS_ENV_FILE, { force: true })
    await rm(join(here, '.env.harness'), { force: true })
  }
}

const mode = process.argv[2] ?? 'storage'
const browser = findBrowser()
const collector = createCollector(mode === 'e2e' ? LONG_TIMEOUT_MS : SHORT_TIMEOUT_MS)

const runners = {
  storage: () => runStorage(browser, collector),
  e2e: () => runE2e(browser, collector),
  ui: () => runUi(browser),
}

const summaries = {
  storage: 'STORAGE LAYER VERIFIED',
  e2e: 'END-TO-END VERIFIED',
  ui: 'UI SHELL VERIFIED',
}

const runner = runners[mode]
if (runner === undefined) {
  console.error(`[harness] unknown mode "${mode}"; expected storage, e2e or ui`)
  process.exit(1)
}

let failures
try {
  failures = await runner()
} finally {
  // Nothing left listening behind.
  await sleep(100)
}

if (failures === 0) {
  console.log(`\n${summaries[mode]}`)
} else {
  console.log(`\n${failures} CHECK(S) FAILED`)
}
process.exitCode = failures === 0 ? 0 : 1
