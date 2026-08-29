import { access, readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))

if (packageJson.name !== '@mickyballadelli/matrix') {
  throw new Error('Package name must be @mickyballadelli/matrix')
}

if (packageJson.private) {
  throw new Error('Package must not be private')
}

const targets = []

for (const definition of Object.values(packageJson.exports)) {
  if (typeof definition === 'string') {
    targets.push(definition)
    continue
  }

  targets.push(definition.types, definition.import, definition.default)
}

for (const target of new Set(targets.filter(Boolean))) {
  await access(new URL(target, root))
}

try {
  await access(new URL('dist/app', root))
  throw new Error('dist/app must not be included in the Matrix package')
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error
  }
}

console.log('Matrix package exports are ready')
