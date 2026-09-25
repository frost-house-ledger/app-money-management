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

The release workflow reads the version from the release commit message, which must use the `release: <version>` format. For example, `release: 2.1` creates the `v2.1` tag and publishes version `2.1.0` to Tauri. Other commit messages do not publish a release. If the requested tag already exists, the workflow fails instead of changing the requested version.

## Published installers

GitHub Actions runs tests and builds the Windows x64 and x86 Tauri installers:

The version in `package.json` is the release version source. `npm run release` synchronizes it to the Tauri configuration before creating the release commit, and GitHub Actions repeats the synchronization before building. A two-part version such as `2.0` is normalized to `2.0.0` for Tauri.

| Public name | Tauri target | File name pattern |
| --- | --- | --- |
| x64 | `nsis` | `HouseLedger-v<major>.<minor>-x64.exe` |
| x86 | `i686-pc-windows-msvc` | `HouseLedger-v<major>.<minor>-x86.exe` |

## Local build checks

Run the normal checks before releasing:

```bash
npm test -- --runInBand
npm run react:build
git diff --check
```

Build the Windows installer locally:

```bash
npm run tauri:build
```

Build both Windows architectures locally:

```bash
rustup target add i686-pc-windows-msvc
npm run dist:win:all
```

The local Tauri build writes installers under `src-tauri/target/`.

## Recovery

The release script never overwrites an existing tag. It increments the minor version until an unused tag is available. If the workflow fails, inspect the GitHub Actions log before retrying.