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

const args = process.argv.slice(2);
const versionIndex = args.findIndex((arg) => arg === '-v' || arg === '--version');
const version = versionIndex >= 0 ? args[versionIndex + 1] : null;
const dryRun = args.includes('--dry-run');

if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  fail('use npm run release -- -v <semver>, for example: npm run release -- -v 0.2.0');
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

const tag = `v${version}`;
if (run('git', ['tag', '--list', tag])) {
  fail(`tag already exists: ${tag}`);
}

if (dryRun) {
  console.log(`Would set package version to ${version}, commit it, create ${tag}, and push master plus ${tag}.`);
  process.exit(0);
}

run('npm.cmd', ['version', version, '--no-git-tag-version'], { stdio: 'inherit', shell: process.platform === 'win32' });
run('git', ['add', 'package.json', 'package-lock.json']);
run('git', ['commit', '-m', `chore: release ${tag}`], { stdio: 'inherit' });
run('git', ['tag', '-a', tag, '-m', `Release ${tag}`], { stdio: 'inherit' });
run('git', ['push', 'origin', 'refs/heads/master:refs/heads/master'], { stdio: 'inherit' });
run('git', ['push', 'origin', `refs/tags/${tag}:refs/tags/${tag}`], { stdio: 'inherit' });

console.log(`Release ${tag} pushed. GitHub Actions will build and publish the installers.`);