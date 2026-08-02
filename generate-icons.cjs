const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgBuffer = fs.readFileSync(path.join(__dirname, 'public/icon.svg'));

const webSizes = [
  { name: 'public/icon-192.png', size: 192 },
  { name: 'public/icon-512.png', size: 512 },
  { name: 'public/icon.png', size: 512 },
  { name: 'dist/icon-192.png', size: 192 },
  { name: 'dist/icon-512.png', size: 512 },
  { name: 'dist/icon.png', size: 512 }
];

const androidMipmaps = [
  { dir: 'android/app/src/main/res/mipmap-mdpi', iconSize: 48, foregroundSize: 108 },
  { dir: 'android/app/src/main/res/mipmap-hdpi', iconSize: 72, foregroundSize: 162 },
  { dir: 'android/app/src/main/res/mipmap-xhdpi', iconSize: 96, foregroundSize: 216 },
  { dir: 'android/app/src/main/res/mipmap-xxhdpi', iconSize: 144, foregroundSize: 324 },
  { dir: 'android/app/src/main/res/mipmap-xxxhdpi', iconSize: 192, foregroundSize: 432 }
];

async function generate() {
  console.log('Generating web & dist icons...');
  for (const item of webSizes) {
    const targetPath = path.join(__dirname, item.name);
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toFile(targetPath);
    console.log(`Generated ${item.name}`);
  }

  console.log('Generating Android APK icons...');
  for (const m of androidMipmaps) {
    const targetDir = path.join(__dirname, m.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // ic_launcher.png
    await sharp(svgBuffer)
      .resize(m.iconSize, m.iconSize)
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png
    await sharp(svgBuffer)
      .resize(m.iconSize, m.iconSize)
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png
    await sharp(svgBuffer)
      .resize(m.foregroundSize, m.foregroundSize)
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated icons in ${m.dir}`);
  }

  console.log('All custom studio APK icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
