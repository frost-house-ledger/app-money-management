const { execFileSync } = require('node:child_process');

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    shell: options.shell || false,
  });
  return typeof output === 'string' ? output.trim() : '';
}

function fail(message) {
  console.error(`Release failed: ${message}`);
  process.exit(1);
}

function bumpMinor(version) {
  const match = version.match(/^(\d+)\.(\d+)(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/);
  if (!match) {
    fail(`cannot bump invalid version: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  return `${minor === 9 ? major + 1 : major}.${minor === 9 ? 0 : minor + 1}`;
}

function tagForVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)/);
  if (!match) {
    fail(`cannot create a tag from invalid version: ${version}`);
  }

  return `v${match[1]}.${match[2]}`;
}

const args = process.argv.slice(2);
const versionIndex = args.findIndex((arg) => arg === '-v' || arg === '--version');
const version = versionIndex >= 0 ? args[versionIndex + 1] : null;
const dryRun = args.includes('--dry-run');

if (!version || !/^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  fail('use npm run release -- -v <version>, for example: npm run release -- -v 0.2');
}

if (args.slice(versionIndex + 2).some((arg) => arg !== '--dry-run')) {
  fail('unknown option');
}

const branch = run('git', ['branch', '--show-current']);
if (branch !== 'master') {
  fail(`releases must be created from master (current branch: ${branch || 'detached HEAD'})`);
}

const status = run('git', ['status', '--porcelain']);
if (status && !dryRun) {
  fail('working tree must be clean before releasing');
}

let releaseVersion = version;
let tag = tagForVersion(releaseVersion);
while (run('git', ['tag', '--list', tag])) {
  releaseVersion = bumpMinor(releaseVersion);
  tag = tagForVersion(releaseVersion);
}
const packageVersion = /^\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(releaseVersion)
  ? releaseVersion.replace(/^([^ -]+)(-.+)?$/, '$1.0$2')
  : releaseVersion;

if (dryRun) {
  console.log(`Would set package version to ${packageVersion}, commit release: ${releaseVersion}, and push master.`);
  process.exit(0);
}

run('npm.cmd', ['version', packageVersion, '--no-git-tag-version'], { stdio: 'inherit', shell: process.platform === 'win32' });
run('npm.cmd', ['run', 'sync:tauri-version'], { stdio: 'inherit', shell: process.platform === 'win32' });
run('git', ['add', 'package.json', 'package-lock.json', 'src-tauri/tauri.conf.json']);
run('git', ['commit', '-m', `release: ${releaseVersion}`], { stdio: 'inherit' });
run('git', ['push', 'origin', 'refs/heads/master:refs/heads/master'], { stdio: 'inherit' });

console.log(`Release commit pushed. GitHub Actions will create ${tag}, build, and publish the installers.`);