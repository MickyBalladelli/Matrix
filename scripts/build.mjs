import { cp, mkdir, rename, stat, writeFile } from 'node:fs/promises'

const outputDirectory = new URL('../dist/', import.meta.url)
const trashDirectory = new URL('../Trash/', import.meta.url)

try {
  await stat(outputDirectory)
  await mkdir(trashDirectory, { recursive: true })
  const backupDirectory = new URL(`./dist-build-${Date.now()}/`, trashDirectory)
  await rename(outputDirectory, backupDirectory)
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error
  }
}

await mkdir(outputDirectory, { recursive: true })
await cp(new URL('../src/', import.meta.url), new URL('./src/', outputDirectory), { recursive: true })

await writeFile(new URL('./matrix.js', outputDirectory), `export * from './src/index.js'\n`)
await writeFile(new URL('./package.json', outputDirectory), JSON.stringify({ type: 'module' }, null, 2) + '\n')

console.log('Matrix browser ESM written to dist/matrix.js')
