# Publish Matrix

Matrix publishes as `@mickyballadelli/matrix`. The first release uses the `next` npm tag.

## Direct publish

Run from the repository root:

```bash
npm login --cache /private/tmp/matrix-npm-cache
npm whoami --cache /private/tmp/matrix-npm-cache

npm pack --dry-run --cache /private/tmp/matrix-npm-cache
npm publish --access public --tag next --cache /private/tmp/matrix-npm-cache

npm view @mickyballadelli/matrix@0.1.0-alpha.0 --cache /private/tmp/matrix-npm-cache
```

`prepack` rebuilds `dist` and checks every export before npm creates the package.

Install the alpha with:

```bash
npm install @mickyballadelli/matrix@next
```

## Change the version

Do not let npm create a git commit or tag:

```bash
npm version prerelease --preid=alpha --no-git-tag-version
```

Update `CHANGELOG.md` and the generator template version before publishing.

## Trusted publish

The manual GitHub workflow in `.github/workflows/publish.yml` uses npm trusted publishing and provenance. Configure this repository and workflow as a trusted publisher in npm before running it.

## Publish create-matrix-app

Publish Matrix first. Then run:

```bash
cd create-matrix-app
npm version prerelease --preid=alpha --no-git-tag-version
npm pack --dry-run --cache /private/tmp/matrix-npm-cache
npm publish --access public --tag next --cache /private/tmp/matrix-npm-cache
```

Confirm the generator template points to the published Matrix version. Then create an app outside this repository:

```bash
npx create-matrix-app@next my-app
cd my-app
npm run build
```

## Promote after Prism works

After a clean Prism Vercel deployment uses the exact alpha successfully:

```bash
npm dist-tag add @mickyballadelli/matrix@0.1.0-alpha.0 latest
```

Prefer publishing a stable version instead of promoting an alpha when public users are expected.
