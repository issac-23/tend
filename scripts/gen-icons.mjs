// Generate PNG icons for PWA + Android notifications from a single SVG source.
// Run with `node scripts/gen-icons.mjs`. Outputs go to public/.
//
// Why PNG instead of SVG: Chrome on Android renders SVG notification icons
// as flat white silhouettes regardless of the SVG content. PWA install
// icons and the Android badge also expect PNG for predictable rendering.

import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');

const colorSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0a0a0a"/>
  <path d="M256 130 C 320 200, 352 264, 304 360 C 280 408, 232 408, 208 360 C 160 264, 192 200, 256 130 Z"
        fill="none" stroke="#f5f5f5" stroke-width="22" stroke-linejoin="round"/>
  <line x1="256" y1="256" x2="256" y2="416" stroke="#f5f5f5" stroke-width="22" stroke-linecap="round"/>
</svg>`;

// Badge is a monochrome silhouette on transparent — Android tints it itself.
const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <path d="M48 16 C 60 30, 66 42, 57 60 C 53 70, 43 70, 39 60 C 30 42, 36 30, 48 16 Z
           M48 50 L 48 80"
        fill="none" stroke="#ffffff" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;

const targets = [
  { name: 'icon-192.png', size: 192, svg: colorSvg },
  { name: 'icon-512.png', size: 512, svg: colorSvg },
  { name: 'icon-180.png', size: 180, svg: colorSvg }, // apple-touch-icon
  { name: 'badge-96.png', size: 96, svg: badgeSvg },
];

for (const t of targets) {
  const buf = await sharp(Buffer.from(t.svg))
    .resize(t.size, t.size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(publicDir, t.name), buf);
  console.log(`wrote ${t.name} (${buf.length} bytes)`);
}

// Also emit a maskable icon (with extra padding for Android adaptive icons)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0a0a"/>
  <g transform="translate(64,64) scale(0.75)">
    <rect width="512" height="512" fill="transparent"/>
    <path d="M256 130 C 320 200, 352 264, 304 360 C 280 408, 232 408, 208 360 C 160 264, 192 200, 256 130 Z"
          fill="none" stroke="#f5f5f5" stroke-width="22" stroke-linejoin="round"/>
    <line x1="256" y1="256" x2="256" y2="416" stroke="#f5f5f5" stroke-width="22" stroke-linecap="round"/>
  </g>
</svg>`;

const maskBuf = await sharp(Buffer.from(maskableSvg))
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(join(publicDir, 'icon-maskable-512.png'), maskBuf);
console.log(`wrote icon-maskable-512.png (${maskBuf.length} bytes)`);
