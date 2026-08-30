# Publish Matrix

Matrix publishes as `@mickyballadelli/matrix`. Prereleases use the `next` npm tag (not `latest`).

Publish yourself from the repository root.

## Preflight

```bash
npm run verify:release
```

`verify:release` runs unit tests, strict type tests, Chromium/Firefox/WebKit tests, performance budgets, package smoke tests and size budgets. `npm publish` runs the same gate through `prepublishOnly`.

Bump the version only when needed. Do not let npm create a git commit or tag:

```bash
npm version prerelease --preid=alpha --no-git-tag-version
```

Update `CHANGELOG.md` and the `create-matrix-app` template dependency to match before publishing.

## Publish

```bash
npm login --cache /private/tmp/matrix-npm-cache
npm whoami --cache /private/tmp/matrix-npm-cache

npm pack --dry-run --cache /private/tmp/matrix-npm-cache
npm publish --access public --tag next --cache /private/tmp/matrix-npm-cache

npm view @mickyballadelli/matrix@version --cache /private/tmp/matrix-npm-cache
```

Replace `version` in the last command with the exact version from `package.json` (currently `0.1.0-alpha.1`).

`prepack` rebuilds `dist` and checks every export before npm creates the package.

Install the alpha with:

```bash
npm install @mickyballadelli/matrix@next
```

## Publish create-matrix-app

Publish Matrix first. Then:

```bash
cd create-matrix-app
npm version prerelease --preid=alpha --no-git-tag-version
npm pack --dry-run --cache /private/tmp/matrix-npm-cache
npm publish --access public --tag next --cache /private/tmp/matrix-npm-cache
```

Confirm the generator template points to the published Matrix version. Then create an app outside this repository:

```bash
npx create-matrix-app@next my-app
```

Until `create-matrix-app` is published, `npx create-matrix-app` returns E404. Use `@next` after the first prerelease publish.

## Promote after Prism works

After a clean Prism Vercel deployment uses the exact alpha successfully:

```bash
npm dist-tag add @mickyballadelli/matrix@0.1.0-alpha.1 latest
```

Prefer publishing a stable version instead of promoting an alpha when public users are expected.
