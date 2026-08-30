import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))

function run(command, arguments_, options = {}) {
  const display = [command, ...arguments_].join(' ')
  console.log(`\n> ${display}`)
  return execFileSync(command, arguments_, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    ...options
  })
}

function parsePackOutput(output) {
  const lines = output.trim().split(/\r?\n/)

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (!lines[index].trim().startsWith('[')) {
      continue
    }

    try {
      const parsed = JSON.parse(lines.slice(index).join('\n'))
      if (Array.isArray(parsed) && parsed[0]?.files) {
        return parsed[0]
      }
    } catch {
      continue
    }
  }

  throw new Error('Could not parse JSON output from npm pack --dry-run')
}

function exportTargets() {
  return Object.values(packageJson.exports).flatMap(definition => {
    if (typeof definition === 'string') {
      return [definition]
    }

    return [definition.types, definition.import, definition.default].filter(Boolean)
  })
}

function packageNameForExport(exportName) {
  return exportName === '.'
    ? packageJson.name
    : `${packageJson.name}/${exportName.slice(2)}`
}

async function checkPackContents() {
  const output = run('npm', ['pack', '--dry-run', '--json'])
  const pack = parsePackOutput(output)
  const paths = new Set(pack.files.map(file => file.path.replaceAll('\\', '/')))
  const required = [
    'package.json',
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
    'SECURITY.md',
    'SUPPORT.md',
    'types/index.d.ts',
    'dist/src/index.js',
    'docs/release-checklist.md'
  ]
  const missingRequired = required.filter(path => !paths.has(path))
  const missingTargets = exportTargets()
    .map(target => target.replace(/^\.\//, ''))
    .filter(target => !paths.has(target))
  const forbiddenPrefixes = [
    'src/',
    'test/',
    'scripts/',
    'bench/',
    'examples/',
    '.github/',
    'create-matrix-app/',
    'Trash/'
  ]
  const forbidden = [...paths].filter(path => path === 'TODO.md' || forbiddenPrefixes.some(prefix => path.startsWith(prefix)))

  if (missingRequired.length > 0 || missingTargets.length > 0 || forbidden.length > 0) {
    const problems = [
      ...missingRequired.map(path => `missing ${path}`),
      ...missingTargets.map(path => `missing export target ${path}`),
      ...forbidden.map(path => `forbidden ${path}`)
    ]
    throw new Error(`Packed file list failed: ${problems.join(', ')}`)
  }

  console.log(`Packed file list passed (${paths.size} files)`)
}

async function checkDocumentedExports() {
  const documentationFiles = (await readdir(resolve(root, 'docs')))
    .filter(file => file.endsWith('.md'))
    .map(file => resolve(root, 'docs', file))
  const documentation = [
    await readFile(resolve(root, 'README.md'), 'utf8'),
    ...(await Promise.all(documentationFiles.map(file => readFile(file, 'utf8'))))
  ].join('\n')
  const source = await readFile(resolve(root, 'src/index.js'), 'utf8')
  const runtimeExports = [...source.matchAll(/export\s*\{([\s\S]*?)\}\s*from\s+['"]/g)]
    .flatMap(match => match[1].split(','))
    .map(name => name.trim().split(/\s+as\s+/)[0])
    .filter(name => /^[A-Za-z_$][\w$]*$/.test(name))
  const uniqueRuntimeExports = [...new Set(runtimeExports)]
  const packageExports = Object.keys(packageJson.exports).map(packageNameForExport)
  const missingRuntimeExports = uniqueRuntimeExports.filter(name => !documentation.includes(`\`${name}\``))
  const missingPackageExports = packageExports.filter(name => !documentation.includes(`\`${name}\``))

  if (missingRuntimeExports.length > 0 || missingPackageExports.length > 0) {
    throw new Error([
      ...missingRuntimeExports.map(name => `undocumented runtime export ${name}`),
      ...missingPackageExports.map(name => `undocumented package entry ${name}`)
    ].join(', '))
  }

  console.log(`Documentation covers ${uniqueRuntimeExports.length} root exports and ${packageExports.length} package entries`)
}

async function checkChangelog() {
  const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')
  const version = packageJson.version
  const headings = [...changelog.matchAll(/^##\s+(.+)$/gm)]
  const versionHeadings = headings.map(match => match[1].trim())
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  if (!/^#\s+Changelog\s*$/m.test(changelog)) {
    throw new Error('CHANGELOG.md must start with a Changelog heading')
  }

  if (!new RegExp(`^${escapedVersion}(?:\\s|$)`, 'm').test(changelog)) {
    throw new Error(`CHANGELOG.md has no entry for package version ${version}`)
  }

  if (new Set(versionHeadings).size !== versionHeadings.length) {
    throw new Error('CHANGELOG.md contains duplicate release headings')
  }

  for (let index = 0; index < headings.length; index += 1) {
    const start = headings[index].index + headings[index][0].length
    const end = headings[index + 1]?.index ?? changelog.length
    const section = changelog.slice(start, end)

    if (!/^-\s+/m.test(section)) {
      throw new Error(`CHANGELOG.md release entry has no bullet list: ${headings[index][1]}`)
    }
  }

  if (/\b(?:TBD|FIXME|coming soon)\b/i.test(changelog)) {
    throw new Error('CHANGELOG.md contains an unfinished release note')
  }

  console.log(`CHANGELOG.md covers ${headings.length} release entries through ${version}`)
}

async function checkPerformanceHistory() {
  const history = JSON.parse(await readFile(resolve(root, 'bench/performance-history.json'), 'utf8'))
  const runs = Array.isArray(history.runs) ? history.runs : []
  const latest = runs.at(-1)
  const requiredMetrics = ['reactivity', 'memory', 'browser', 'size', 'comparison']

  if (history.schemaVersion !== 1 || runs.length < 2) {
    throw new Error('Record at least two performance history runs before release: npm run bench:record -- --phase baseline --label <version>')
  }

  const missingMetrics = requiredMetrics.filter(metric => latest?.[metric] == null)
  if (!latest?.recordedAt || !latest.label || missingMetrics.length > 0) {
    throw new Error(`Latest performance history entry is incomplete${missingMetrics.length > 0 ? ` (missing ${missingMetrics.join(', ')})` : ''}`)
  }

  if (!Array.isArray(latest.regressions)) {
    throw new Error('Latest performance history entry has no regression result')
  }

  if (latest.regressions.length > 0) {
    throw new Error(`Performance regression detected: ${latest.regressions.map(regression => regression.metric).join(', ')}`)
  }

  console.log(`Performance history compares ${runs.length} recorded runs with no regressions`)
}

await checkPackContents()
await checkDocumentedExports()
run(process.execPath, ['scripts/check-production-console.mjs'], { stdio: 'inherit' })
run(process.execPath, ['scripts/check-node-deprecations.mjs'], { stdio: 'inherit' })
run('npm', ['run', 'size'], { stdio: 'inherit' })
await checkChangelog()
await checkPerformanceHistory()

console.log('\nLocal pre-release checklist passed')
