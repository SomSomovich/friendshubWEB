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

/** Flags shared by every launch. */
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
  const logHandle = openSync(join(here, `edge-${label}.log`), 'w')
  const child = spawn(
    browser,
    [...EDGE_FLAGS, EDGE_KEEP_ALIVE_FLAG, `--user-data-dir=${PROFILE_DIR}`, url],
    { stdio: ['ignore', logHandle, logHandle] },
  )

  try {
    return await collector.awaitResult()
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
      expect: ['Экран «Вход»', '<html lang="ru" data-theme="dark"'],
    },
    {
      label: 'login-light-en',
      route: '/login',
      theme: 'light',
      lang: 'en',
      size: '375,720',
      ready: `document.body.innerText.includes('Sign in') && ${STYLE_READY}`,
      expect: ['The “Sign in” screen', '<html lang="en" data-theme="light"'],
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
      // With no account in a fresh profile, the guard has to send this to login.
      label: 'guard-redirect-dark-ru',
      route: '/app',
      theme: 'dark',
      lang: 'ru',
      size: '1280,800',
      ready: "document.body.innerText.includes('Вход')",
      expect: ['Экран «Вход»'],
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

    for (const capture of captures) {
      const screenshotPath = join(here, '.tmp', `${capture.label}.png`)
      const result = await capturePage({
        browser,
        url: `${origin}${capture.route}`,
        profileDir: join(here, '.tmp', `profile-${capture.label}`),
        windowSize: capture.size,
        readyExpression: capture.ready,
        screenshotPath,
        prepare: `localStorage.setItem('fh.theme', '${capture.theme}');localStorage.setItem('fh.lang', '${capture.lang}')`,
      })

      await writeFile(screenshotPath, Buffer.from(result.screenshot ?? '', 'base64'))
      await writeFile(join(here, '.tmp', `${capture.label}.html`), result.dom)

      console.log(`--- ${capture.label} ---`)
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
