import { brotliCompressSync, gzipSync } from 'node:zlib'
import { readFile } from 'node:fs/promises'

const entry = new URL('../src/index.js', import.meta.url)
const visited = new Set()
const modules = []

async function collect(file) {
  if (visited.has(file.href)) {
    return
  }

  visited.add(file.href)
  const source = await readFile(file, 'utf8')
  modules.push({ file: file.pathname, source })

  const imports = source.matchAll(/(?:from\s+|import\s*)['"](\.\.?\/[^'"]+)['"]/g)
  for (const match of imports) {
    const child = new URL(match[1], file)
    await collect(child)
  }
}

await collect(entry)

const source = Buffer.from(modules
  .sort((left, right) => left.file.localeCompare(right.file))
  .map(module => `// ${module.file}\n${module.source}`)
  .join('\n'))

console.log(JSON.stringify({
  entry: 'src/index.js',
  modules: modules.length,
  bytes: source.length,
  gzipBytes: gzipSync(source).length,
  brotliBytes: brotliCompressSync(source).length,
  minified: null,
  note: 'Aggregated ESM graph measurement; minification will be added with the selected bundler.'
}, null, 2))
