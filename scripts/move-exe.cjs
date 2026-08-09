const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const release = path.join(root, 'release');

if (!fs.existsSync(release)) {
  process.exit(0);
}

for (const name of ['AMM-Setup-x64.exe', 'AMM-Setup-x86.exe', 'AMM-Setup-ia32.exe']) {
  const target = path.join(root, name);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { force: true });
  }
}

for (const fileName of fs.readdirSync(release)) {
  const match = fileName.match(/^HouseLedger-.*-(x64|ia32)\.exe$/i);
  if (!match) {
    continue;
  }

  const architecture = match[1].toLowerCase() === 'ia32' ? 'x86' : 'x64';
  const destination = path.join(root, `AMM-Setup-${architecture}.exe`);
  fs.copyFileSync(path.join(release, fileName), destination);
  console.log(`Copied release/${fileName} -> ${path.basename(destination)}`);
}

console.log('Portable app folders are available in release/win-unpacked and release/win-ia32-unpacked');