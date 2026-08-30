import { execFileSync } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const arguments_ = process.argv.slice(2)
const version = arguments_.find(argument => !argument.startsWith('-'))
const requireTag = arguments_.includes('--require-tag')

if (arguments_.includes('--help') || arguments_.includes('-h')) {
  printHelp()
  process.exit(0)
}

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Give the stable version to verify, for example 0.1.0 or 1.0.0')
}

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const packageLock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'))
const generatorPackage = JSON.parse(await readFile(resolve(root, 'create-matrix-app/package.json'), 'utf8'))
const templatePackage = JSON.parse(await readFile(resolve(root, 'create-matrix-app/template/package.json'), 'utf8'))
const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')
const publishGuide = await readFile(resolve(root, 'PUBLISH.md'), 'utf8')
const readmes = await Promise.all([
  readFile(resolve(root, 'README.md'), 'utf8'),
  readFile(resolve(root, 'create-matrix-app/README.md'), 'utf8'),
  readFile(resolve(root, 'docs/tutorial-10-minute.md'), 'utf8'),
  readFile(resolve(root, 'docs/prism.md'), 'utf8')
])

if (packageJson.version !== version || packageLock.packages?.['']?.version !== version) {
  throw new Error(`Root package and lockfile must use stable version ${version}`)
}

if (generatorPackage.version !== version) {
  throw new Error(`create-matrix-app must use stable version ${version}`)
}

if (templatePackage.dependencies?.['@mickyballadelli/matrix'] !== version) {
  throw new Error(`create-matrix-app template must depend on Matrix ${version}`)
}

const changelogHeading = new RegExp(`^##\\s+${escapeRegExp(version)}\\s+—\\s+\\d{4}-\\d{2}-\\d{2}\\s*$`, 'm')
if (!changelogHeading.test(changelog)) {
  throw new Error(`CHANGELOG.md needs a dated ${version} release heading`)
}

const releaseNotesPath = resolve(root, 'docs/releases', `${version}.md`)
await access(releaseNotesPath)
const releaseNotes = await readFile(releaseNotesPath, 'utf8')
if (!/^#\s+/m.test(releaseNotes) || !/^-\s+/m.test(releaseNotes)) {
  throw new Error(`Release notes need a heading and bullet list: docs/releases/${version}.md`)
}

const installDocumentation = readmes.join('\n')
if (!installDocumentation.includes('npm install @mickyballadelli/matrix')) {
  throw new Error('Stable install documentation is missing: npm install @mickyballadelli/matrix')
}

if (/@mickyballadelli\/matrix@next|create-matrix-app@next/.test(installDocumentation)) {
  throw new Error('Stable install documentation still points at the next npm tag')
}

if (packageJson.publishConfig?.access !== 'public') {
  throw new Error('Root package must publish publicly')
}

if (!publishGuide.includes('npm publish --access public --tag latest')) {
  throw new Error('PUBLISH.md must document npm latest publishing')
}

if (!publishGuide.includes('git tag -a')) {
  throw new Error('PUBLISH.md must document the release tag command')
}

const tag = execFileSync('git', ['tag', '--list', `v${version}`], {
  cwd: root,
  encoding: 'utf8'
}).trim()

if (requireTag && tag !== `v${version}`) {
  throw new Error(`Missing git tag v${version}`)
}

if (tag) {
  console.log(`Git tag v${version} exists`)
} else {
  console.log(`Git tag v${version} pending; pass --require-tag after creating it`)
}

run('npm', ['run', 'test:package'])
checkGeneratorPackage()

console.log(`Stable release metadata passed for ${version}`)

function run(command, arguments_) {
  console.log(`\n> ${command} ${arguments_.join(' ')}`)
  execFileSync(command, arguments_, { cwd: root, stdio: 'inherit' })
}

function checkGeneratorPackage() {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: resolve(root, 'create-matrix-app'),
    encoding: 'utf8'
  })
  const pack = parsePackOutput(output)
  const paths = new Set(pack.files.map(file => file.path.replaceAll('\\', '/')))
  const required = ['package.json', 'index.js', 'README.md', 'template/package.json', 'template/index.html']
  const missing = required.filter(path => !paths.has(path))

  if (missing.length > 0) {
    throw new Error(`create-matrix-app package is missing: ${missing.join(', ')}`)
  }

  console.log(`create-matrix-app package list passed (${paths.size} files)`)
}

function parsePackOutput(output) {
  const lines = output.trim().split(/\r?\n/)

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (!['[', '{'].some(prefix => lines[index].trim().startsWith(prefix))) {
      continue
    }

    try {
      const parsed = JSON.parse(lines.slice(index).join('\n'))
      if (Array.isArray(parsed)) {
        const pack = parsed.find(entry => entry?.files)
        if (pack) {
          return pack
        }
      } else if (parsed?.files) {
        return parsed
      } else if (parsed && typeof parsed === 'object') {
        const pack = Object.values(parsed).find(entry => entry?.files)
        if (pack) {
          return pack
        }
      }
    } catch {
      continue
    }
  }

  throw new Error('Could not parse create-matrix-app npm pack JSON output')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function printHelp() {
  console.log(`Usage:
  npm run release:check -- <version>
  npm run release:check -- <version> --require-tag

The check is local. It verifies stable metadata, release notes, install docs,
package smoke imports, create-matrix-app contents, and the optional git tag.`)
}
