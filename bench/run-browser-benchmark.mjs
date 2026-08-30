import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from '@playwright/test'
import { performanceBudgets } from './performance-budgets.js'
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
const fixtureFlagIndex = process.argv.indexOf('--fixture')
const requestedFixture = process.env.MATRIX_BENCHMARK_FIXTURE
  ?? (fixtureFlagIndex >= 0 ? process.argv[fixtureFlagIndex + 1] : undefined)
const fixtures = requestedFixture
  ? [requestedFixture.replace(/^\/+/, '')]
  : ['bench/dom.browser.html', 'bench/extended.browser.html', 'bench/optimization.browser.html']
const check = process.argv.includes('--check')
const jsonOutput = process.argv.includes('--json')
const reports = []

if (selectedBrowsers.some(([, browserType]) => !browserType)) {
  throw new Error(`Unknown browser "${requestedBrowser}". Use one of: ${Object.keys(browserTypes).join(', ')}${suggestClosest(requestedBrowser, Object.keys(browserTypes))}`)
}

for (const fixture of fixtures) {
  const file = resolve(root, fixture)
  if (!file.startsWith(`${root}${sep}`)) {
    throw new Error(`Benchmark fixture must be inside the repository: ${fixture}`)
  }
}

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

async function launchBrowser(browserName, browserType) {
  try {
    return await browserType.launch()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/Executable doesn't exist|executable.*not found/i.test(message)) {
      throw new Error(`Playwright ${browserName} is not installed. Run: npx playwright install ${browserName}`)
    }
    throw error
  }
}

await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen))
const { port } = server.address()

function checkMeasurements(measurements) {
  return measurements
    .filter(({ name, milliseconds }) => {
      const budget = performanceBudgets.browser[name]
      return budget !== undefined && milliseconds > budget
    })
    .map(({ name, milliseconds }) => `${name} ${milliseconds}ms > ${performanceBudgets.browser[name]}ms`)
}

try {
  for (const [browserName, browserType] of selectedBrowsers) {
    const browser = await launchBrowser(browserName, browserType)
    try {
      for (const fixture of fixtures) {
        const page = await browser.newPage()
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
          await page.waitForFunction(() => window.__MATRIX_BENCHMARK_RESULT__, null, { timeout: 30000 })

          const result = await page.evaluate(() => window.__MATRIX_BENCHMARK_RESULT__)
          if (failures.length > 0) {
            throw new Error(failures.join('\n'))
          }

          const budgetFailures = check ? checkMeasurements(result.measurements) : []
          if (budgetFailures.length > 0) {
            throw new Error(`DOM performance budget exceeded: ${budgetFailures.join('; ')}`)
          }

          const report = { browser: browserName, fixture, ...result }
          reports.push(report)
          if (!jsonOutput) {
            console.log(JSON.stringify(report, null, 2))
          }
        } finally {
          await page.close()
        }
      }
    } finally {
      await browser.close()
    }
  }
} finally {
  await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()))
}

if (jsonOutput) {
  console.log(JSON.stringify(reports))
}
