# Release Guide

Releases are created from the `master` branch. Development work should be merged into `master` before running the release command.

## Prerequisites

- Node.js version 22 or newer
- A clean Git working tree
- Push permission for the repository
- GitHub Actions permission to create releases

Check the working tree and branch first:

```bash
git status
git branch --show-current
```

The branch must be `master`. This repository has had both a branch and a tag named `master`, so use explicit refs when inspecting or synchronising refs:

```bash
git diff refs/heads/master refs/heads/dev
git push origin refs/heads/master:refs/heads/master
```

## Dry run

Validate the version and release conditions without changing Git or package files:

```bash
npm run release -- -v 1.3.0 --dry-run
```

Versions must use semantic versioning, for example `1.3.0` or `1.3.0-beta.1`.

## Create a release

```bash
npm run release -- -v 1.3.0
```

The script:

1. Verifies that the current branch is `master`.
2. Requires a clean working tree.
3. Updates `package.json` and `package-lock.json`.
4. Commits the version change.
5. Creates the annotated tag `v1.3.0`.
6. Pushes `master` and the tag to `origin`.

Pushing the tag starts the Windows release workflow.

## Published installers

GitHub Actions runs tests and builds both Windows architectures:

| Public name | Electron Builder target | File name pattern |
| --- | --- | --- |
| x64 | `x64` | `HouseLedger-v<version>-x64.exe` |
| x86 | `ia32` | `HouseLedger-v<version>-x86.exe` |

`ia32` is the internal Electron Builder architecture name. Users see `x86` in the published installer name.

## Local build checks

Run the normal checks before releasing:

```bash
npm test -- --runInBand
npm run react:build
git diff --check
```

Build both Windows installers locally when required:

```bash
npm run dist:win:all
```

The local build writes installers under `release/` and copies the 32-bit output to the `x86` name.

## Recovery

Do not reuse an existing tag. Choose a new version or remove the tag only after confirming that no public release depends on it. If the workflow fails, inspect the GitHub Actions log before retrying.