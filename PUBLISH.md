# Publish Matrix

Release actions stay local and manual. No GitHub workflow publishes Matrix.

Matrix prereleases use the `next` npm tag. Stable releases use `latest`.

## Prepare a stable release

Create `docs/releases/<version>.md` from `docs/releases/TEMPLATE.md`. Use a
dated heading and real bullet points, then preview the changes:

```bash
npm run release:prepare -- 1.0.0 --date YYYY-MM-DD --notes-file docs/releases/1.0.0.md --dry-run
```

Run it without `--dry-run` when the notes are ready:

```bash
npm run release:prepare -- 1.0.0 --date YYYY-MM-DD --notes-file docs/releases/1.0.0.md
```

This updates the root package and lockfile, `create-matrix-app`, its Matrix
template dependency, the changelog, and stable install examples. It does not
create a commit, tag, npm release, or announcement.

## Preflight

Keep the previous performance run in the repository, then run the full local
gate:

```bash
npx playwright install chromium firefox webkit
npm run bench:record -- --phase baseline --label 1.0.0
npm run verify:release
npm run release:check -- 1.0.0
```

`release:check` verifies stable metadata, dated release notes, stable install
docs, the packed Matrix installation, the `create-matrix-app` package, and the
optional tag. Add `--require-tag` after creating the tag.

For a local Chromium-only measurement, use:

```bash
MATRIX_BROWSER=chromium npm run bench:record -- --phase baseline --label 1.0.0 --browser chromium
```

Do not use a one-browser run as the final release baseline.

## Create the tag and release notes

After preflight passes, create and push the stable tag:

```bash
git tag -a v1.0.0 -m "Matrix v1.0.0"
git push origin v1.0.0
```

Create the hosting-service release from `docs/releases/1.0.0.md`, or use the
GitHub CLI if it is installed:

```bash
gh release create v1.0.0 --title "Matrix v1.0.0" --notes-file docs/releases/1.0.0.md
```

Verify the tag locally:

```bash
npm run release:check -- 1.0.0 --require-tag
```

## Publish Matrix as latest

Log in with the project-local npm cache, publish the exact prepared version,
then inspect the registry tag. The cache is ignored by git and avoids relying
on a user cache with broken permissions:

```bash
npm login --cache ./.npm-cache
npm whoami --cache ./.npm-cache
npm publish --access public --tag latest --cache ./.npm-cache
npm view @mickyballadelli/matrix@1.0.0 dist-tags version --cache ./.npm-cache
```

`prepublishOnly` runs `npm run verify:release`. Never use `npm version` without
`--no-git-tag-version` in this repository.

## Publish create-matrix-app when changed

The stable preparation command synchronizes its version and template. Publish
it only when the generator changed or its version was prepared:

```bash
cd create-matrix-app
npm pack --dry-run --cache ../.npm-cache
npm publish --access public --tag latest --cache ../.npm-cache
npm view create-matrix-app@1.0.0 dist-tags version --cache ../.npm-cache
cd ..
```

Verify the public generator after publishing:

```bash
npx create-matrix-app@latest release-smoke --no-install
```

Use a disposable directory outside this repository for that smoke app.

## Verify installation and announce

`npm run release:check -- 1.0.0` verifies the packed installation locally. After
the registry publish, verify the public command too:

```bash
npm install @mickyballadelli/matrix
npm install create-matrix-app
```

Share `docs/releases/1.0.0.md` as the blog post or announcement source. It
already contains the user-facing changes, migration notes, and verification
state collected for the release.

## Prereleases

For an alpha, keep the `next` tag and use the prerelease version command:

```bash
npm version prerelease --preid=alpha --no-git-tag-version
npm publish --access public --tag next --cache ./.npm-cache
```

Update `CHANGELOG.md` and the generator template dependency before publishing.
