import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const historyArgument = valueFor('--history') ?? 'bench/performance-history.json'
const historyFile = resolve(root, historyArgument)
const phase = valueFor('--phase') ?? 'baseline'
const change = valueFor('--change') ?? null
const label = valueFor('--label') ?? packageJson.version
const check = process.argv.includes('--check')

if (!['baseline', 'before', 'after'].includes(phase)) {
  throw new Error(`Unknown performance run phase "${phase}". Use baseline, before, or after`)
}

if ((phase === 'before' || phase === 'after') && !change) {
  throw new Error(`Performance run phase "${phase}" requires --change <identifier>`)
}

if (historyFile !== root && !historyFile.startsWith(`${root}${sep}`)) {
  throw new Error(`Performance history must be inside the repository: ${historyArgument}`)
}

function valueFor(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function runJson(command, arguments_) {
  const output = execFileSync(command, arguments_, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  })
  return JSON.parse(output.trim())
}

async function readHistory() {
  try {
    return JSON.parse(await readFile(historyFile, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
    return { schemaVersion: 1, runs: [] }
  }
}

function collectMetrics(run) {
  const metrics = {}
  const add = (name, value, direction) => {
    if (Number.isFinite(value)) {
      metrics[name] = { value, direction }
    }
  }

  add('reactivity.updatesPerSecond', run.reactivity?.updatesPerSecond, 'higher')
  add('reactivity.milliseconds', run.reactivity?.milliseconds, 'lower')
  add('reactivity.rapidSignalUpdates.milliseconds', run.reactivity?.rapidSignalUpdates?.milliseconds, 'lower')

  for (const report of run.browser ?? []) {
    for (const measurement of report.measurements ?? []) {
      add(`browser.${report.browser}.${report.fixture}.${measurement.name}`, measurement.milliseconds, 'lower')
    }
  }

  for (const [name, measurement] of Object.entries(run.size ?? {})) {
    add(`size.${name}.brotliBytes`, measurement.brotliBytes, 'lower')
  }

  for (const result of run.comparison?.results ?? []) {
    add(`comparison.${result.framework}.mountMilliseconds`, result.mountMilliseconds, 'lower')
    add(`comparison.${result.framework}.updateMilliseconds`, result.updateMilliseconds, 'lower')
    add(`comparison.${result.framework}.unmountMilliseconds`, result.unmountMilliseconds, 'lower')
  }

  return metrics
}

function findRegressions(reference, current) {
  if (!reference) {
    return []
  }

  const tolerance = 0.05
  const before = collectMetrics(reference)
  const after = collectMetrics(current)
  const regressions = []

  for (const [name, currentMetric] of Object.entries(after)) {
    const previousMetric = before[name]
    if (!previousMetric || previousMetric.direction !== currentMetric.direction || previousMetric.value === 0) {
      continue
    }

    const changePercent = ((currentMetric.value - previousMetric.value) / previousMetric.value) * 100
    const regressed = currentMetric.direction === 'lower'
      ? changePercent > tolerance * 100
      : changePercent < -tolerance * 100

    if (regressed) {
      regressions.push({
        metric: name,
        before: previousMetric.value,
        after: currentMetric.value,
        changePercent: Number(changePercent.toFixed(2)),
        tolerancePercent: tolerance * 100
      })
    }
  }

  return regressions
}

const history = await readHistory()
const runs = Array.isArray(history.runs) ? history.runs : []
const reference = phase === 'after'
  ? [...runs].reverse().find(run => run.phase === 'before' && run.change === change)
  : runs.at(-1)

if (phase === 'after' && !reference) {
  throw new Error(`No matching before run found for optimization "${change}"`)
}

const browser = runJson(process.execPath, ['bench/run-browser-benchmark.mjs', '--json'])
const entry = {
  id: `${Date.now()}-${label}`,
  label,
  phase,
  change,
  recordedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    browsers: [...new Set(browser.map(report => report.browser))]
  },
  reactivity: runJson(process.execPath, ['bench/reactivity.js']),
  memory: runJson(process.execPath, ['--expose-gc', 'bench/memory.js']),
  browser,
  size: runJson(process.execPath, ['scripts/size.mjs']),
  comparison: runJson(process.execPath, ['bench/compare.mjs'])
}

entry.regressions = findRegressions(reference, entry)
history.schemaVersion = 1
history.runs = [...runs, entry]

await mkdir(dirname(historyFile), { recursive: true })
await writeFile(historyFile, `${JSON.stringify(history, null, 2)}\n`)

console.log(JSON.stringify({
  recorded: entry.id,
  phase,
  reference: reference?.id ?? null,
  regressions: entry.regressions,
  historyFile
}, null, 2))

if (check && entry.regressions.length > 0) {
  throw new Error(`Performance regression detected in ${entry.regressions.map(regression => regression.metric).join(', ')}`)
}
