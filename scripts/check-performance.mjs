import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../', import.meta.url)))

execFileSync(process.execPath, [resolve(root, 'bench/reactivity.js'), '--check'], {
  cwd: root,
  stdio: 'inherit'
})

execFileSync(process.execPath, ['--expose-gc', resolve(root, 'bench/memory.js')], {
  cwd: root,
  stdio: 'inherit'
})

execFileSync(process.execPath, [resolve(root, 'bench/run-browser-benchmark.mjs'), '--check'], {
  cwd: root,
  stdio: 'inherit'
})
