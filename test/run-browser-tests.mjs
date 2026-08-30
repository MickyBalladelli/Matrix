import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices, firefox, webkit } from '@playwright/test'
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
const deviceFlagIndex = process.argv.indexOf('--device')
const requestedDevice = process.env.MATRIX_BROWSER_DEVICE
  ?? (deviceFlagIndex >= 0 ? process.argv[deviceFlagIndex + 1] : undefined)
const channelFlagIndex = process.argv.indexOf('--channel')
const requestedChannel = process.env.MATRIX_BROWSER_CHANNEL
  ?? (channelFlagIndex >= 0 ? process.argv[channelFlagIndex + 1] : undefined)
const colorSchemeFlagIndex = process.argv.indexOf('--color-scheme')
const requestedColorScheme = process.env.MATRIX_COLOR_SCHEME
  ?? (colorSchemeFlagIndex >= 0 ? process.argv[colorSchemeFlagIndex + 1] : undefined)
const selectedBrowsers = requestedBrowser
  ? [[requestedBrowser, browserTypes[requestedBrowser]]]
  : Object.entries(browserTypes)
const fixtureFlagIndex = process.argv.indexOf('--fixture')
const requestedFixture = process.env.MATRIX_BROWSER_FIXTURE
  ?? (fixtureFlagIndex >= 0 ? process.argv[fixtureFlagIndex + 1] : undefined)
const fixtures = requestedFixture
  ? [requestedFixture.replace(/^\/+/, '')]
  : ['test/dom.browser.html', 'test/integration.browser.html', 'test/examples.browser.html', 'test/edge-cases.browser.html', 'test/browser-compatibility.browser.html']

if (selectedBrowsers.some(([, browserType]) => !browserType)) {
  throw new Error(`Unknown browser "${requestedBrowser}". Use one of: ${Object.keys(browserTypes).join(', ')}${suggestClosest(requestedBrowser, Object.keys(browserTypes))}`)
}

if (requestedDevice && !devices[requestedDevice]) {
  throw new Error(`Unknown Playwright device "${requestedDevice}". Use a configured device such as: ${Object.keys(devices).filter(name => /iPhone|Pixel|Galaxy/.test(name)).slice(0, 8).join(', ')}${suggestClosest(requestedDevice, Object.keys(devices))}`)
}

if (requestedDevice && !requestedBrowser) {
  throw new Error('A device profile requires --browser chromium, firefox, or webkit')
}

if (requestedChannel && requestedBrowser !== 'chromium') {
  throw new Error('Browser channels are supported only with --browser chromium')
}

if (requestedColorScheme && !['light', 'dark', 'no-preference'].includes(requestedColorScheme)) {
  throw new Error(`Unknown color scheme "${requestedColorScheme}". Use light, dark, or no-preference`)
}

for (const fixture of fixtures) {
  const file = resolve(root, fixture)
  if (!file.startsWith(`${root}${sep}`)) {
    throw new Error(`Browser fixture must be inside the repository: ${fixture}`)
  }
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
    const browser = await browserType.launch(requestedChannel ? { channel: requestedChannel } : undefined)
    const deviceOptions = requestedDevice ? { ...devices[requestedDevice] } : {}
    delete deviceOptions.defaultBrowserType
    if (requestedColorScheme) {
      deviceOptions.colorScheme = requestedColorScheme
    }
    const context = await browser.newContext(deviceOptions)
    try {
      for (const fixture of fixtures) {
        const page = await context.newPage()
        const failures = []
        page.on('console', message => {
          if (message.type() === 'error') {
            failures.push(`${browserName} ${fixture} console: ${message.text()}`)
          }
        })
        page.on('pageerror', error => {
          failures.push(`${browserName} ${fixture} pageerror: ${error.stack || error.message}`)
        })

        try {
          await page.goto(`http://127.0.0.1:${port}/${fixture}`)
          await page.waitForFunction(() => window.__MATRIX_TEST_RESULT__ === 'passed', null, { timeout })

          if (failures.length > 0) {
            throw new Error(failures.join('\n'))
          }

          console.log(`${browserName} ${fixture} passed`)
        } finally {
          await page.close()
        }
      }
    } finally {
      await context.close()
      await browser.close()
    }
  }
} finally {
  await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()))
}
