import { cp, mkdir, writeFile } from 'node:fs/promises'

const outputDirectory = new URL('../dist/', import.meta.url)

await mkdir(outputDirectory, { recursive: true })
await cp(new URL('../src/', import.meta.url), new URL('./src/', outputDirectory), { recursive: true })

await writeFile(new URL('./matrix.js', outputDirectory), `export * from './src/index.js'\n`)
await writeFile(new URL('./package.json', outputDirectory), JSON.stringify({ type: 'module' }, null, 2) + '\n')

console.log('Matrix browser ESM written to dist/matrix.js')
