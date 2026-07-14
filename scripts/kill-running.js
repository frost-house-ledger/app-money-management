const { exec } = require('child_process');
const path = require('path');
const pkg = require(path.join(__dirname, '..', 'package.json'));

const product = (pkg.build && pkg.build.productName) || pkg.productName || pkg.name || 'house-ledger';

function escapeForRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
const candidates = [product, product.replace(/\s+/g, ''), product + '-'];
const regex = new RegExp(candidates.map(escapeForRegex).join('|'), 'i');

if (process.platform !== 'win32'){
  console.log('Non-Windows platform detected — skipping kill-running.');
  process.exit(0);
}

exec('tasklist /FO CSV /NH', (err, stdout) => {
  if (err) {
    console.error('tasklist failed:', err.message);
    process.exit(0);
  }

  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const matches = [];

  for (const line of lines) {
    // CSV: "Image Name","PID","Session Name","Session#","Mem Usage"
    const m = line.match(/^"([^"]+)","(\d+)","([^"]+)","(\d+)","([^"]+)"$/);
    if (!m) continue;
    const image = m[1];
    const pid = m[2];
    if (regex.test(image)) matches.push({ image, pid });
  }

  if (matches.length === 0) {
    console.log('No running instances matching', product);
    process.exit(0);
  }

  console.log('Found running instances:');
  matches.forEach(m => console.log(' ', m.image, 'PID', m.pid));

  let done = 0;
  for (const m of matches) {
    exec(`taskkill /PID ${m.pid} /F`, (err, stdout, stderr) => {
      if (err) console.error('Failed to kill PID', m.pid, err.message);
      else console.log('Killed', m.image, 'PID', m.pid);
      done += 1;
      if (done === matches.length) process.exit(0);
    });
  }
});
