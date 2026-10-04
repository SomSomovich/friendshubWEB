/**
 * A minimal Chrome DevTools Protocol driver, enough to look at the app.
 *
 * The one-shot `--dump-dom`/`--screenshot` flags are not usable here: the app
 * waits for IndexedDB before it renders anything, and a virtual-time budget can
 * expire before that finishes, which captures a spinner instead of a screen.
 * Driving a live browser over CDP means the harness can wait for a real
 * condition and only then capture.
 *
 * Only three commands are used: navigate, evaluate, capture a screenshot.
 */
import { spawn, spawnSync } from 'node:child_process'

const DEBUG_PORT = 9222
const CONNECT_TIMEOUT_MS = 30_000
const WAIT_TIMEOUT_MS = 30_000

function sleep(ms) {
  return new Promise((ready) => setTimeout(ready, ms))
}

async function waitForDebugTarget() {
  const deadline = Date.now() + CONNECT_TIMEOUT_MS
  for (;;) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
      const targets = await response.json()
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl)
      if (page !== undefined) {
        return page.webSocketDebuggerUrl
      }
    } catch {
      // The browser is not listening yet.
    }
    if (Date.now() >= deadline) {
      throw new Error('[driver] the browser never exposed a debugging target')
    }
    await sleep(200)
  }
}

/** A CDP session: request/response over the page's WebSocket. */
async function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl)
  const pending = new Map()
  let nextId = 0

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const entry = pending.get(message.id)
    if (entry === undefined) {
      return
    }
    pending.delete(message.id)
    if (message.error) {
      entry.reject(new Error(`${entry.method}: ${message.error.message}`))
      return
    }
    entry.resolve(message.result)
  })

  await new Promise((ready, fail) => {
    socket.addEventListener('open', ready, { once: true })
    socket.addEventListener('error', () => fail(new Error('[driver] could not connect to the browser')), {
      once: true,
    })
  })

  function send(method, params = {}) {
    nextId += 1
    const id = nextId
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, method })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }

  return { send, close: () => socket.close() }
}

/**
 * Opens `url` in a fresh browser, waits until `readyExpression` is true, then
 * captures a screenshot and the DOM.
 *
 * `readyExpression` is evaluated in the page: a screen is ready when the element
 * it is built from exists, which is a far more honest signal than a fixed delay.
 */
export async function capturePage(options) {
  const { browser, url, profileDir, windowSize, readyExpression, screenshotPath, prepare } = options

  const child = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${profileDir}`,
      `--window-size=${windowSize}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  try {
    const session = await connect(await waitForDebugTarget())
    try {
      await session.send('Page.enable')

      // Preferences live in localStorage, which is per origin, so the page has
      // to be on the origin before they can be set and the target loaded.
      if (prepare !== undefined) {
        await session.send('Page.navigate', { url: `${new URL(url).origin}/favicon.svg` })
        await session.send('Runtime.evaluate', { expression: prepare })
      }

      await session.send('Page.navigate', { url })

      const deadline = Date.now() + WAIT_TIMEOUT_MS
      for (;;) {
        const result = await session.send('Runtime.evaluate', {
          expression: readyExpression,
          returnByValue: true,
        })
        if (result.result?.value === true) {
          break
        }
        if (Date.now() >= deadline) {
          throw new Error(`[driver] "${readyExpression}" never became true for ${url}`)
        }
        await sleep(250)
      }

      const dom = await session.send('Runtime.evaluate', {
        expression: 'document.documentElement.outerHTML',
        returnByValue: true,
      })

      let screenshot = null
      if (screenshotPath !== undefined) {
        const shot = await session.send('Page.captureScreenshot', { format: 'png' })
        screenshot = shot.data
      }

      return { dom: dom.result?.value ?? '', screenshot }
    } finally {
      // Closes the browser itself, not just the launcher process Node spawned.
      await session.send('Browser.close').catch(() => undefined)
      session.close()
      await sleep(500)
    }
  } finally {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'ignore' })
    } else {
      child.kill()
    }
  }
}
