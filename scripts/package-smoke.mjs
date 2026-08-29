import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, resolve } from 'node:path'

const root = new URL('../', import.meta.url)
const cache = resolve(tmpdir(), 'matrix-npm-cache')
const fixture = await mkdtemp(resolve(tmpdir(), 'matrix-package-smoke-'))
const trash = new URL('../Trash/', import.meta.url)

const packed = JSON.parse(execFileSync('npm', [
  'pack',
  '--json',
  '--cache', cache
], {
  cwd: root,
  encoding: 'utf8'
}))

const tarballName = packed[0].filename
const tarball = new URL(tarballName, root)

await writeFile(resolve(fixture, 'package.json'), JSON.stringify({
  private: true,
  type: 'module'
}, null, 2))

execFileSync('npm', [
  'install',
  tarball.pathname,
  '--ignore-scripts',
  '--cache', cache
], {
  cwd: fixture,
  stdio: 'inherit'
})

await writeFile(resolve(fixture, 'smoke.mjs'), `
const entries = [
  '@mickyballadelli/matrix',
  '@mickyballadelli/matrix/reactivity',
  '@mickyballadelli/matrix/components',
  '@mickyballadelli/matrix/dom',
  '@mickyballadelli/matrix/jsx-runtime',
  '@mickyballadelli/matrix/jsx-dev-runtime',
  '@mickyballadelli/matrix/styles',
  '@mickyballadelli/matrix/utils',
  '@mickyballadelli/matrix/plugins'
]

for (const entry of entries) {
  const module = await import(entry)
  if (!module || Object.keys(module).length === 0) {
    throw new Error(\`Empty module: \${entry}\`)
  }
}

console.log('Packed Matrix imports work')
`)

execFileSync(process.execPath, ['smoke.mjs'], {
  cwd: fixture,
  stdio: 'inherit'
})

await mkdir(trash, { recursive: true })
await rename(tarball, new URL(`./${basename(tarballName, '.tgz')}-${Date.now()}.tgz`, trash))
await writeFile(new URL(`./package-smoke-${Date.now()}.txt`, trash), await readFile(resolve(fixture, 'package.json')))
