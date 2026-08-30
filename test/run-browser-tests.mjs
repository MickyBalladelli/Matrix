import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from '@playwright/test'
import { suggestClosest } from '../src/utils/suggestions.js'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
}

const browserTypes = { chromium, firefox, webkit }
const browserFlagIndex = process.argv.indexOf('--browser')
const requestedBrowser = process.env.MATRIX_BROWSER
  ?? (browserFlagIndex >= 0 ? process.argv[browserFlagIndex + 1] : undefined)
const selectedBrowsers = requestedBrowser
  ? [[requestedBrowser, browserTypes[requestedBrowser]]]
  : Object.entries(browserTypes)

if (selectedBrowsers.some(([, browserType]) => !browserType)) {
  throw new Error(`Unknown browser "${requestedBrowser}". Use one of: ${Object.keys(browserTypes).join(', ')}${suggestClosest(requestedBrowser, Object.keys(browserTypes))}`)
}

const timeout = Number(process.env.MATRIX_BROWSER_TIMEOUT ?? 30000)

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const file = resolve(root, `.${pathname}`)

    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end('Forbidden')
      return
    }

    const body = await readFile(file)
    response.writeHead(200, { 'content-type': contentTypes[extname(file)] ?? 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404).end('Not found')
  }
})

await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen))
const { port } = server.address()

try {
  for (const [browserName, browserType] of selectedBrowsers) {
    const browser = await browserType.launch()
    const page = await browser.newPage()
    const failures = []
    page.on('console', message => {
      if (message.type() === 'error') {
        failures.push(`${browserName} console: ${message.text()}`)
      }
    })
    page.on('pageerror', error => {
      failures.push(`${browserName} pageerror: ${error.stack || error.message}`)
    })

    try {
      await page.goto(`http://127.0.0.1:${port}/test/dom.browser.html`)
      await page.waitForFunction(() => window.__MATRIX_TEST_RESULT__ === 'passed', null, { timeout })

      if (failures.length > 0) {
        throw new Error(failures.join('\n'))
      }

      console.log(`${browserName} passed`)
    } finally {
      await browser.close()
    }
  }
} finally {
  await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()))
}
