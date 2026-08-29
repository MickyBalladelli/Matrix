# Publish Matrix and create-matrix-app

This repository contains two npm packages:

- `matrix` — the Matrix library
- `create-matrix-app` — the project generator used by `npx`

Publish `matrix` first. Generated apps install Matrix from npm.

## Before publishing

1. Create an npm account.
2. Check that the package names are available.
3. Make sure the version is new. npm does not allow publishing the same name and version twice.
4. Matrix is currently marked private in the root `package.json`. Remove `"private": true` before publishing Matrix.
5. Make sure the dependency in `create-matrix-app/template/package.json` points to the published Matrix version.

Official docs:

- [npm login](https://docs.npmjs.com/cli/v11/commands/npm-login/)
- [npm publish](https://docs.npmjs.com/cli/commands/npm-publish/)

## Login

Run once on the machine that publishes packages:

```bash
npm login
npm whoami
```

## Publish Matrix

Run from the repository root:

```bash
npm version patch
npm run build
npm pack --dry-run
npm publish --access public
```

Use `npm version minor` or `npm version major` when the change needs a larger version bump.

The dry run shows which files npm will publish. The real publish sends the package to the npm registry.

## Publish create-matrix-app

Update the Matrix dependency first if needed, then run from the generator directory:

```bash
cd create-matrix-app
npm version patch
npm pack --dry-run
npm publish --access public
```

The generator package has a `bin` entry, so npm exposes it as the `create-matrix-app` command.

## Use with npx

After both packages are published:

```bash
npx create-matrix-app my-app
cd my-app
npm run dev
```

Build the generated app with:

```bash
npm run build
```

Test a specific generator version with:

```bash
npx create-matrix-app@0.0.1 my-app
```

## Local generator development

Use the generator without publishing it:

```bash
npm run create-app -- examples/my-app
```

When the target is inside this repository, the generator uses the local Matrix package. For a target outside this repository, it uses the published Matrix package version.
