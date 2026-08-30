# Publish Matrix

Release actions stay local and manual. No GitHub workflow publishes Matrix.

Matrix prereleases use the `next` npm tag. Stable releases use `latest`.

## Prepare a stable release

Create `docs/releases/<version>.md` from `docs/releases/TEMPLATE.md`. Use a
dated heading and real bullet points, then preview the changes:

```bash
npm run release:prepare -- 0.1.0 --date YYYY-MM-DD --notes-file docs/releases/0.1.0.md --dry-run
```

Run it without `--dry-run` when the notes are ready:

```bash
npm run release:prepare -- 0.1.0 --date YYYY-MM-DD --notes-file docs/releases/0.1.0.md
```

This updates the root package and lockfile, `create-matrix-app`, its Matrix
template dependency, the changelog, and stable install examples. It does not
create a commit, tag, npm release, or announcement.

## Preflight

Keep the previous performance run in the repository, then run the full local
gate:

```bash
npm run bench:record -- --phase baseline --label 0.1.0
npm run verify:release
npm run release:check -- 0.1.0
```

`release:check` verifies stable metadata, dated release notes, stable install
docs, the packed Matrix installation, the `create-matrix-app` package, and the
optional tag. Add `--require-tag` after creating the tag.

## Create the tag and release notes

After preflight passes, create and push the stable tag:

```bash
git tag -a v0.1.0 -m "Matrix v0.1.0"
git push origin v0.1.0
```

Create the hosting-service release from `docs/releases/0.1.0.md`, or use the
GitHub CLI if it is installed:

```bash
gh release create v0.1.0 --title "Matrix v0.1.0" --notes-file docs/releases/0.1.0.md
```

Verify the tag locally:

```bash
npm run release:check -- 0.1.0 --require-tag
```

## Publish Matrix as latest

Log in with a project-scoped npm cache, publish the exact prepared version,
then inspect the registry tag:

```bash
npm login --cache /private/tmp/matrix-npm-cache
npm whoami --cache /private/tmp/matrix-npm-cache
npm publish --access public --tag latest --cache /private/tmp/matrix-npm-cache
npm view @mickyballadelli/matrix@0.1.0 dist-tags version --cache /private/tmp/matrix-npm-cache
```

`prepublishOnly` runs `npm run verify:release`. Never use `npm version` without
`--no-git-tag-version` in this repository.

## Publish create-matrix-app when changed

The stable preparation command synchronizes its version and template. Publish
it only when the generator changed or its version was prepared:

```bash
cd create-matrix-app
npm pack --dry-run --cache /private/tmp/matrix-npm-cache
npm publish --access public --tag latest --cache /private/tmp/matrix-npm-cache
npm view create-matrix-app@0.1.0 dist-tags version --cache /private/tmp/matrix-npm-cache
cd ..
```

Verify the public generator after publishing:

```bash
npx create-matrix-app@latest release-smoke --no-install
```

Use a disposable directory outside this repository for that smoke app.

## Verify installation and announce

`npm run release:check -- 0.1.0` verifies the packed installation locally. After
the registry publish, verify the public command too:

```bash
npm install @mickyballadelli/matrix
npm install create-matrix-app
```

Share `docs/releases/0.1.0.md` as the blog post or announcement source. It
already contains the user-facing changes, migration notes, and verification
state collected for the release.

## Prereleases

For an alpha, keep the `next` tag and use the prerelease version command:

```bash
npm version prerelease --preid=alpha --no-git-tag-version
npm publish --access public --tag next --cache /private/tmp/matrix-npm-cache
```

Update `CHANGELOG.md` and the generator template dependency before publishing.
