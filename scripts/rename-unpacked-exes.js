const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = [
  { dir: path.join(root, 'release', 'win-unpacked'), arch: 'x64' },
  { dir: path.join(root, 'release', 'win-ia32-unpacked'), arch: 'ia32' }
];

targets.forEach(({ dir, arch }) => {
  try {
    const src = path.join(dir, 'MoneyManagement.exe');
    if (!fs.existsSync(dir)) {
      console.log('Directory not found:', dir);
      return;
    }
    if (fs.existsSync(src)) {
      const dst = path.join(dir, `MoneyManagement-${arch}.exe`);
      fs.renameSync(src, dst);
      console.log('Renamed', src, '->', dst);
    } else {
      console.log('Not found:', src);
    }
  } catch (err) {
    console.error('Error processing', dir, err && err.message ? err.message : err);
  }
});
