#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { basename, dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const showHelp = args.includes('--help') || args.includes('-h')
const skipInstall = args.includes('--no-install')
const parsedArguments = parseArguments(args)
const projectArgument = parsedArguments.project
const requestedExample = parsedArguments.example
const cliDirectory = dirname(fileURLToPath(import.meta.url))
const matrixDirectory = resolve(cliDirectory, '..')
const exampleTemplates = new Set(['blog'])

if (showHelp) {
  printHelp()
  process.exit(0)
}

if (!projectArgument) {
  console.error('Give app directory. Example: npx create-matrix-app my-app')
  process.exit(1)
}

if (requestedExample && !exampleTemplates.has(requestedExample)) {
  console.error(`Unknown example "${requestedExample}". Use one of: ${[...exampleTemplates].join(', ')}`)
  process.exit(1)
}

const targetDirectory = resolve(process.cwd(), projectArgument)
const packageName = toPackageName(basename(targetDirectory))

if (!packageName) {
  console.error('App directory must have a valid npm name.')
  process.exit(1)
}

await prepareTargetDirectory(targetDirectory)
await cp(resolve(cliDirectory, 'template'), targetDirectory, { recursive: true })
if (requestedExample) {
  await cp(
    resolve(cliDirectory, 'example-templates', requestedExample, 'main.jsx'),
    resolve(targetDirectory, 'src/main.jsx')
  )
}

const packagePath = resolve(targetDirectory, 'package.json')
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))
packageJson.name = packageName

if (await isLocalMatrixProject(targetDirectory)) {
  packageJson.dependencies['@mickyballadelli/matrix'] = `file:${relative(targetDirectory, matrixDirectory) || '.'}`
}

await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)

console.log(`Created ${targetDirectory}`)

if (!skipInstall) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npmCommand, ['install'], {
    cwd: targetDirectory,
    stdio: 'inherit'
  })

  if (result.error) {
    console.error(`Could not run npm install: ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log(`Next:\n  cd ${projectArgument}\n  npm run dev`)

function printHelp() {
  console.log(`Usage:
  npx create-matrix-app <directory>

Options:
  --no-install  Create files without running npm install
  --example <name>  Start from an official example template (blog)
  --help        Show this help`)
}

function parseArguments(argumentsList) {
  let project
  let example

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]
    if (argument === '--example') {
      example = argumentsList[index + 1]
      index += 1
      continue
    }
    if (argument.startsWith('--example=')) {
      example = argument.slice('--example='.length)
      continue
    }
    if (!argument.startsWith('-') && !project) {
      project = argument
    }
  }

  return { project, example }
}

async function prepareTargetDirectory(directory) {
  try {
    const entries = await readdir(directory)
    if (entries.length > 0) {
      console.error(`Directory is not empty: ${directory}`)
      process.exit(1)
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
    await mkdir(directory, { recursive: true })
  }
}

async function isLocalMatrixProject(directory) {
  const isInsideMatrixProject = directory === matrixDirectory || directory.startsWith(`${matrixDirectory}${sep}`)

  if (!isInsideMatrixProject) {
    return false
  }

  try {
    const matrixPackage = JSON.parse(await readFile(resolve(matrixDirectory, 'package.json'), 'utf8'))
    return matrixPackage.name === '@mickyballadelli/matrix'
  } catch {
    return false
  }
}

function toPackageName(directoryName) {
  return directoryName
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
}
