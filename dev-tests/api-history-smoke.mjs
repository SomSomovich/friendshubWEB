/** A real Firefox check of history import and IndexedDB; no live API is called. */
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const directory = await mkdtemp(join(tmpdir(), 'friendshub-history-'))
await build({ configFile: false, plugins: [react(), tailwindcss()], logLevel: 'error', define: { 'process.env.NODE_ENV': '"production"' }, build: { outDir: directory, emptyOutDir: false,
  lib: { entry: resolve(process.argv[2] ?? 'dev-tests/api-history-smoke.ts'), formats: ['es'], fileName: () => 'smoke.js' },
} })
const styles = (await readdir(directory)).filter((name) => name.endsWith('.css')).map((name) => `<link rel="stylesheet" href="/${name}">`).join('')
let complete
const report = new Promise((resolve) => { complete = resolve })
const server = createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/result') {
      let body = ''
      for await (const chunk of request) { body += chunk; if (body.length > 100000) throw new Error('report too large') }
      complete(JSON.parse(body)); response.end('ok'); return
    }
    if (request.url === '/') { response.setHeader('Content-Type', 'text/html'); response.end(`<meta http-equiv="Content-Security-Policy" content="img-src 'self' data:">${styles}<script>for(const kind of ['error','unhandledrejection'])window.addEventListener(kind,e=>fetch('/result',{method:'POST',body:JSON.stringify({ok:false,error:String(e.message??e.reason?.message??'')+' '+String(e.error?.stack??e.reason?.stack??e.reason??'')})}));</script><script type="module" src="/smoke.js"></script>`); return }
    const name = new URL(request.url, 'http://localhost').pathname.slice(1)
    if (!name || name.includes('..')) { response.writeHead(404).end(); return }
    response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'application/octet-stream')
    response.end(await readFile(join(directory, name)))
  } catch { response.writeHead(404).end() }
})
await new Promise((ready) => server.listen(0, '127.0.0.1', ready))
const profile = await mkdtemp(join(tmpdir(), 'friendshub-firefox-'))
const browser = spawn('/usr/bin/firefox', ['--headless', '--no-remote', '--profile', profile, `http://127.0.0.1:${server.address().port}`], { stdio: ['ignore', 'ignore', 'pipe'] })
let browserErrors = ''
browser.stderr.on('data', (chunk) => { browserErrors = (browserErrors + chunk).slice(-4000) })
browser.on('exit', (code) => { if (code !== null && code !== 0) complete({ ok: false, error: `Firefox exited ${code}: ${browserErrors}` }) })
browser.on('error', (error) => complete({ ok: false, error: error.message }))
const timer = setTimeout(() => complete({ ok: false, error: `Firefox check timed out: ${browserErrors}` }), 40000)
try {
  const result = await report
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exitCode = 1
} finally {
  clearTimeout(timer)
  browser.kill('SIGTERM')
  browser.unref()
  await new Promise((done) => server.close(done))
}
