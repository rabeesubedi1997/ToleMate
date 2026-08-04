/* eslint-env node */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const GREEN = '#16a34a';
const DARK_GREEN = '#15803d';

function createLogoSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${GREEN};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${DARK_GREEN};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size / 200})">
    <path d="M100 30 L100 60 Q100 80 120 80 L140 60 L140 30 Z" fill="white" opacity="0.95"/>
    <path d="M120 80 L140 100 L160 80" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
    <circle cx="140" cy="100" r="10" fill="${GREEN}" stroke="white" stroke-width="3" opacity="0.95"/>
  </g>
</svg>`;
}

async function generateIcons() {
  console.log('Starting icon generation...');
  
  const sizes = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { name, size } of sizes) {
    const dir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const svg = createLogoSvg(size);
    
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    console.log(`Generated ${name}: ${size}x${size}`);
  }

  // Web favicons
  const webDir = path.join(__dirname, '..', 'frontend', 'public');
  const faviconSizes = [16, 32, 48, 64, 128, 144, 192, 256];
  
  for (const size of faviconSizes) {
    const svg = createLogoSvg(size);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(webDir, `favicon-${size}x${size}.png`));
    console.log(`Generated favicon-${size}x${size}.png`);
  }

  // Generate favicon.ico (using 32x32)
  await sharp(Buffer.from(createLogoSvg(32)))
    .resize(32, 32)
    .toFile(path.join(webDir, 'favicon.ico'));
  console.log('Generated favicon.ico');

  // Generate apple-touch-icon
  await sharp(Buffer.from(createLogoSvg(180)))
    .resize(180, 180)
    .png()
    .toFile(path.join(webDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate logo192 and logo512 for PWA
  await sharp(Buffer.from(createLogoSvg(192)))
    .resize(192, 192)
    .png()
    .toFile(path.join(webDir, 'logo192.png'));
  await sharp(Buffer.from(createLogoSvg(512)))
    .resize(512, 512)
    .png()
    .toFile(path.join(webDir, 'logo512.png'));
  console.log('Generated logo192.png and logo512.png');

  // Update manifest.json
  const manifestPath = path.join(webDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.icons = [
      { src: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { src: '/favicon-72x72.png', sizes: '72x72', type: 'image/png' },
      { src: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { src: '/favicon-128x128.png', sizes: '128x128', type: 'image/png' },
      { src: '/favicon-144x144.png', sizes: '144x144', type: 'image/png' },
      { src: '/favicon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/favicon-256x256.png', sizes: '256x256', type: 'image/png' },
      { src: '/logo512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Updated manifest.json');
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(e => { console.error(e); process.exit(1); });