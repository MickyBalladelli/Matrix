import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const rootPath = fileURLToPath(root)
const cache = resolve(rootPath, '.npm-cache')
const fixture = await mkdtemp(resolve(tmpdir(), 'matrix-package-smoke-'))
const trash = new URL('../Trash/', import.meta.url)

execFileSync('npm', ['run', 'build'], { cwd: rootPath, stdio: 'inherit' })
execFileSync(process.execPath, [resolve(rootPath, 'scripts/check-package.mjs')], { cwd: rootPath, stdio: 'inherit' })

const packedOutput = execFileSync('npm', [
  'pack',
  '--json',
  '--ignore-scripts',
  '--cache', cache
], {
  cwd: rootPath,
  encoding: 'utf8'
})
const jsonStart = Math.min(...[packedOutput.indexOf('{'), packedOutput.indexOf('[')].filter(index => index >= 0))
const packedJson = JSON.parse(packedOutput.slice(jsonStart))
const packed = Array.isArray(packedJson) ? packedJson[0] : packedJson[Object.keys(packedJson)[0]]
const tarballName = packed.filename
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

const typescript = resolve(fileURLToPath(root), 'node_modules/typescript/bin/tsc')

await writeFile(resolve(fixture, 'smoke.tsx'), `/** @jsxImportSource @mickyballadelli/matrix */
import { component, computed, html, mount, signal } from '@mickyballadelli/matrix'
import { batch } from '@mickyballadelli/matrix/reactivity'
import { jsx } from '@mickyballadelli/matrix/jsx-runtime'
import type { ComponentResult, Signal } from '@mickyballadelli/matrix'

const count: Signal<number> = signal(0)
const doubled = computed(() => count.value * 2)
const view: ComponentResult = component(() => html\`<button>\${count} / \${doubled}</button>\`)
const element = jsx('button', { children: count })
batch(() => count.set(1))
declare const host: Element
mount(() => [view, element], host)
`)

await writeFile(resolve(fixture, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    lib: ['DOM', 'ES2022'],
    jsx: 'react-jsx',
    jsxImportSource: '@mickyballadelli/matrix',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    noEmit: true,
    strict: true,
    target: 'ES2022'
  },
  include: ['./smoke.tsx']
}, null, 2))

execFileSync(typescript, ['-p', 'tsconfig.json'], {
  cwd: fixture,
  stdio: 'inherit'
})

await mkdir(trash, { recursive: true })
await rename(tarball, new URL(`./${basename(tarballName, '.tgz')}-${Date.now()}.tgz`, trash))
await writeFile(new URL(`./package-smoke-${Date.now()}.txt`, trash), await readFile(resolve(fixture, 'package.json')))
