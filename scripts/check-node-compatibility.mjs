import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const basicFixture = resolve(root, 'test/runtime-compatibility/basic.mjs')
const nodeFixture = resolve(root, 'test/node-compatibility.test.js')
const requestedBinaries = process.env.MATRIX_NODE_BINARIES
  ?.split(',')
  .map(binary => binary.trim())
  .filter(Boolean)
const binaries = requestedBinaries?.length > 0 ? requestedBinaries : [process.execPath]

for (const binary of [...new Set(binaries)]) {
  const version = execFileSync(binary, ['--version'], { encoding: 'utf8' }).trim()
  const major = Number(version.replace(/^v/, '').split('.')[0])
  if (major < 18) {
    throw new Error(`Matrix requires Node 18 or newer. Received ${version} from ${binary}`)
  }

  console.log(`\n> ${binary} ${version}`)
  execFileSync(binary, [basicFixture], { cwd: root, stdio: 'inherit' })
  execFileSync(binary, ['--test', nodeFixture], { cwd: root, stdio: 'inherit' })
}
