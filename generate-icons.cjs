const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

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

const splashScreens = [
  { path: 'android/app/src/main/res/drawable/splash.png', width: 800, height: 1280 },
  { path: 'android/app/src/main/res/drawable-port-mdpi/splash.png', width: 320, height: 480 },
  { path: 'android/app/src/main/res/drawable-port-hdpi/splash.png', width: 480, height: 800 },
  { path: 'android/app/src/main/res/drawable-port-xhdpi/splash.png', width: 720, height: 1280 },
  { path: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png', width: 960, height: 1600 },
  { path: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png', width: 1280, height: 1920 },
  { path: 'android/app/src/main/res/drawable-land-mdpi/splash.png', width: 480, height: 320 },
  { path: 'android/app/src/main/res/drawable-land-hdpi/splash.png', width: 800, height: 480 },
  { path: 'android/app/src/main/res/drawable-land-xhdpi/splash.png', width: 1280, height: 720 },
  { path: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png', width: 1600, height: 960 },
  { path: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png', width: 1920, height: 1280 }
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

  // Copy dist/icon.svg if dist exists
  if (fs.existsSync(path.join(__dirname, 'dist'))) {
    fs.copyFileSync(svgPath, path.join(__dirname, 'dist/icon.svg'));
  }

  console.log('Generating Android APK launcher icons...');
  for (const m of androidMipmaps) {
    const targetDir = path.join(__dirname, m.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Standard raster icon (ic_launcher.png)
    await sharp(svgBuffer)
      .resize(m.iconSize, m.iconSize)
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // Round launcher icon (ic_launcher_round.png)
    await sharp(svgBuffer)
      .resize(m.iconSize, m.iconSize)
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // Adaptive Foreground (ic_launcher_foreground.png)
    await sharp(svgBuffer)
      .resize(m.foregroundSize, m.foregroundSize)
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated icons in ${m.dir}`);
  }

  console.log('Generating Android Splash screens...');
  for (const splash of splashScreens) {
    const targetPath = path.join(__dirname, splash.path);
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Create a dark background image with centered icon logo
    const iconDimension = Math.min(splash.width, splash.height) * 0.45;
    const resizedIcon = await sharp(svgBuffer)
      .resize(Math.round(iconDimension), Math.round(iconDimension))
      .toBuffer();

    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: { r: 7, g: 18, b: 38, alpha: 1 } // #071226 navy dark theme
      }
    })
      .composite([{ input: resizedIcon, gravity: 'center' }])
      .png({ compressionLevel: 6 })
      .toFile(targetPath);

    console.log(`Generated splash: ${splash.path} (${splash.width}x${splash.height})`);
  }

  console.log('All custom studio APK icons & splash screens generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
