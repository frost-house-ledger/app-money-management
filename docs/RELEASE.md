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
npm run release -- -v 1.3 --dry-run
```

Release versions use `major.minor`, for example `1.3` or `1.3-beta.1`.

## Create a release

```bash
npm run release -- -v 1.3
```

The script:

1. Verifies that the current branch is `master`.
2. Requires a clean working tree.
3. Updates `package.json` and `package-lock.json`.
4. Commits the version change.
5. Commits the version change with the message `release: 1.3`.
6. Pushes `master` to `origin`.

The push starts the Windows release workflow. The workflow creates the annotated tag `v1.3` and publishes the Windows installers from that tag:

```text
release: 1.3
```

The release script updates `package.json` to the requested version and uses the `v<major>.<minor>` tag format. Other commit messages do not publish a release. If the requested tag already exists, the release script automatically increments the minor version: `1.0` becomes `1.1`, and `1.9` becomes `2.0`.

## Published installers

GitHub Actions runs tests and builds both Windows architectures. The x86 build uses Electron 31.7.7 because Electron 44 no longer publishes ia32 headers:

| Public name | Electron Builder target | File name pattern |
| --- | --- | --- |
| x64 | `x64` | `HouseLedger-v<major>.<minor>-x64.exe` |
| x86 | `ia32` | `HouseLedger-v<major>.<minor>-x86.exe` |

## Local build checks

Run the normal checks before releasing:

```bash
npm test -- --runInBand
npm run react:build
git diff --check
```

Build the Windows installer locally:

```bash
npm run dist:win:all
```

The local build writes the installer under `release/`.

## Recovery

The release script never overwrites an existing tag. It increments the minor version until an unused tag is available. If the workflow fails, inspect the GitHub Actions log before retrying.