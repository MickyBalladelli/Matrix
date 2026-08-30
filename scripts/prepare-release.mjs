import { readFile, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const arguments_ = process.argv.slice(2)
const version = arguments_.find(argument => !argument.startsWith('-'))
const releaseDate = valueFor('--date') ?? new Date().toISOString().slice(0, 10)
const notesFileArgument = valueFor('--notes-file') ?? (version ? `docs/releases/${version}.md` : undefined)
const dryRun = arguments_.includes('--dry-run')

if (arguments_.includes('--help') || arguments_.includes('-h')) {
  printHelp()
  process.exit(0)
}

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Give a stable version, for example 0.1.0 or 1.0.0')
}

if (!isIsoDate(releaseDate)) {
  throw new Error(`Release date must be a real YYYY-MM-DD date, received ${releaseDate}`)
}

const expectedNotesFile = resolve(root, 'docs/releases', `${version}.md`)
const notesFile = resolve(root, notesFileArgument ?? '')
if (notesFile !== expectedNotesFile) {
  throw new Error(`Release notes must be ${notesFileArgument}`)
}

if (notesFile !== root && !notesFile.startsWith(`${root}${sep}`)) {
  throw new Error(`Release notes must be inside the repository: ${notesFileArgument}`)
}

const notes = normalizeNotes(await readFile(notesFile, 'utf8'))
const packagePath = resolve(root, 'package.json')
const packageLockPath = resolve(root, 'package-lock.json')
const generatorPackagePath = resolve(root, 'create-matrix-app/package.json')
const templatePackagePath = resolve(root, 'create-matrix-app/template/package.json')
const changelogPath = resolve(root, 'CHANGELOG.md')

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
const packageLock = JSON.parse(await readFile(packageLockPath, 'utf8'))
const generatorPackage = JSON.parse(await readFile(generatorPackagePath, 'utf8'))
const templatePackage = JSON.parse(await readFile(templatePackagePath, 'utf8'))
const changelog = await readFile(changelogPath, 'utf8')
const versionPattern = new RegExp(`^##\\s+${escapeRegExp(version)}(?:\\s|$)`, 'm')

if (packageJson.version === version) {
  throw new Error(`Package is already at ${version}`)
}

if (versionPattern.test(changelog)) {
  throw new Error(`CHANGELOG.md already contains ${version}`)
}

packageJson.version = version
if (packageLock.packages?.['']) {
  packageLock.packages[''].version = version
}
generatorPackage.version = version
templatePackage.dependencies ??= {}
templatePackage.dependencies['@mickyballadelli/matrix'] = version

const releaseEntry = `## ${version} — ${releaseDate}\n\n${notes}\n`
const changelogTitleEnd = changelog.indexOf('\n')
const updatedChangelog = changelogTitleEnd < 0
  ? `${changelog}\n\n${releaseEntry}`
  : `${changelog.slice(0, changelogTitleEnd + 1)}\n${releaseEntry}\n${changelog.slice(changelogTitleEnd + 1)}`
const updates = [
  [packagePath, `${JSON.stringify(packageJson, null, 2)}\n`],
  [packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`],
  [generatorPackagePath, `${JSON.stringify(generatorPackage, null, 2)}\n`],
  [templatePackagePath, `${JSON.stringify(templatePackage, null, 2)}\n`],
  [changelogPath, updatedChangelog],
  ...(await updateStableInstallDocs())
]

for (const [file, content] of updates) {
  const relativeFile = file.replace(`${root}${sep}`, '')

  if (dryRun) {
    console.log(`Would update ${relativeFile}`)
    continue
  }

  await writeFile(file, content)
  console.log(`Updated ${relativeFile}`)
}

console.log(`\nStable release ${version} is prepared${dryRun ? ' (dry run)' : ''}`)
console.log('Next: npm run verify:release')
console.log(`Then: npm run release:check -- ${version} --require-tag`)

function valueFor(flag) {
  const index = arguments_.indexOf(flag)
  return index >= 0 ? arguments_[index + 1] : undefined
}

function printHelp() {
  console.log(`Usage:
  npm run release:prepare -- <version> --date YYYY-MM-DD --notes-file docs/releases/<version>.md

Options:
  --dry-run  Show the files that would change without writing them
  --help     Show this help`)
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeNotes(value) {
  const lines = value.trim().split(/\r?\n/)
  const body = lines[0].startsWith('# ') ? lines.slice(1).join('\n').trim() : value.trim()

  if (!body || !/^-\s+/m.test(body)) {
    throw new Error('Release notes must contain at least one Markdown bullet')
  }

  if (/\b(?:TBD|TODO|FIXME|coming soon)\b/i.test(body)) {
    throw new Error('Release notes contain an unfinished placeholder')
  }

  return body
}

async function updateStableInstallDocs() {
  const files = [
    resolve(root, 'README.md'),
    resolve(root, 'create-matrix-app/README.md'),
    resolve(root, 'docs/tutorial-10-minute.md'),
    resolve(root, 'docs/prism.md')
  ]

  return Promise.all(files.map(async file => {
    const current = await readFile(file, 'utf8')
    const updated = current
      .replaceAll('@mickyballadelli/matrix@next', '@mickyballadelli/matrix')
      .replaceAll('create-matrix-app@next', 'create-matrix-app')
      .replace('Install the alpha from npm.', 'Install Matrix from npm.')
      .replace('Until the first npm release is published, that command returns E404.\n\n', '')
    return [file, updated]
  }))
}
