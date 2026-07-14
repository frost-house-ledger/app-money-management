const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const iconsDir = path.join(root, 'build', 'icons');
if (!fs.existsSync(iconsDir)) {
  console.error('icons directory not found:', iconsDir);
  process.exit(1);
}

const candidates = [
  path.join(iconsDir, 'source.png'),
  path.join(iconsDir, 'source.jpg'),
  path.join(iconsDir, 'icon-256.png'),
  path.join(iconsDir, 'icon.png')
];

let src = candidates.find((p) => fs.existsSync(p));
if (!src) {
  console.error('No source icon found. Place source.png or source.jpg in build/icons');
  process.exit(1);
}

console.log('Using source icon:', src);

const icoPath = path.join(iconsDir, 'icon.ico');
const icnsPath = path.join(iconsDir, 'icon.icns');
const png256 = path.join(iconsDir, 'icon-256.png');

try {
  // generate .ico with multiple sizes
  console.log('Generating', icoPath);
  execSync(`magick "${src}" -define icon:auto-resize=256,128,64,48,32,16 "${icoPath}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('Failed to generate .ico with ImageMagick:', e && e.message);
}

try {
  // ensure a 256 png exists
  if (!fs.existsSync(png256)) {
    console.log('Generating', png256);
    execSync(`magick "${src}" -resize 256x256 "${png256}"`, { stdio: 'inherit' });
  }
} catch (e) {
  console.error('Failed to generate 256 PNG:', e && e.message);
}

// Try to create .icns — this may only work on systems with proper ImageMagick/ICNS support
try {
  console.log('Attempting to generate', icnsPath);
  // ImageMagick can sometimes write .icns directly; try resizing to multiple sizes and write
  execSync(`magick "${src}" -resize 512x512 "${icnsPath}"`, { stdio: 'inherit' });
  if (fs.existsSync(icnsPath)) console.log('Generated', icnsPath);
} catch (e) {
  console.warn('Could not generate .icns automatically. If you need .icns, run on macOS or install an ICNS tool.');
}

console.log('Icon generation complete. build.icon should point to build/icons/icon');
