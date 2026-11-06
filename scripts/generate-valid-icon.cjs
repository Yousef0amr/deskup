const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, c]);
}

/**
 * Computes subpixel RGBA for point (px, py) on a canvas of size x size.
 * Returns [r, g, b, a] where 0 <= r,g,b,a <= 255
 */
function sampleIcon(px, py, size) {
  const cx = size / 2;
  const cy = size / 2;
  const squircleScale = size * 0.44;

  const u = (px - cx) / squircleScale;
  const v = (py - cy) / squircleScale;
  const absU = Math.abs(u);
  const absV = Math.abs(v);

  // Smooth squircle boundary
  const squircleDist = Math.pow(absU, 4.5) + Math.pow(absV, 4.5);
  if (squircleDist > 1.0) {
    return [0, 0, 0, 0];
  }

  // Sparkles geometry
  const starRadius = size * 0.235;
  const mdx = Math.abs((px - cx) / starRadius);
  const mdy = Math.abs((py - cy) / starRadius);
  const isMainStar = (Math.pow(mdx, 0.55) + Math.pow(mdy, 0.55)) <= 1.0;

  // Companion sparkle (top-right)
  const s2x = cx + size * 0.21;
  const s2y = cy - size * 0.21;
  const s2r = size * 0.088;
  const s2dx = Math.abs((px - s2x) / s2r);
  const s2dy = Math.abs((py - s2y) / s2r);
  const isSmallStar = (Math.pow(s2dx, 0.55) + Math.pow(s2dy, 0.55)) <= 1.0;

  // Dot spark (bottom-left)
  const s3x = cx - size * 0.21;
  const s3y = cy + size * 0.21;
  const s3r = size * 0.052;
  const dotDistSq = Math.pow((px - s3x) / s3r, 2) + Math.pow((py - s3y) / s3r, 2);
  const isDot = dotDistSq <= 1.0;

  if (isMainStar || isSmallStar || isDot) {
    // Pure crisp white glyph
    return [255, 255, 255, 255];
  }

  // Soft shadow behind glyph
  const shadowDist = 1.25;
  const shdx = Math.abs((px - (cx + shadowDist)) / starRadius);
  const shdy = Math.abs((py - (cy + shadowDist)) / starRadius);
  const isShadow = (Math.pow(shdx, 0.55) + Math.pow(shdy, 0.55)) <= 1.0;

  // Vibrant gradient from indigo-600 (#4f46e5) to cyan-400 (#22d3ee)
  const diag = (px - py + size) / (2 * size);
  const t = Math.max(0, Math.min(1, diag));

  let r = Math.round(79 * (1 - t) + 34 * t);
  let g = Math.round(70 * (1 - t) + 211 * t);
  let b = Math.round(229 * (1 - t) + 238 * t);

  // Subtle top rim highlight for 3D depth
  const rim = Math.max(0, 1.0 - squircleDist);
  if (rim < 0.18 && py < cy) {
    const rimFactor = ((0.18 - rim) / 0.18) * 0.28;
    r = Math.min(255, Math.round(r + 90 * rimFactor));
    g = Math.min(255, Math.round(g + 90 * rimFactor));
    b = Math.min(255, Math.round(b + 60 * rimFactor));
  }

  if (isShadow && !isMainStar && !isSmallStar && !isDot) {
    // Gentle ambient occlusion under star
    r = Math.round(r * 0.82);
    g = Math.round(g * 0.82);
    b = Math.round(b * 0.88);
  }

  return [r, g, b, 255];
}

function renderIconPixels(size) {
  const ss = (size <= 64) ? 4 : 2; // Supersampling
  const totalSamples = ss * ss;
  const pixels = [];

  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let accR = 0, accG = 0, accB = 0, accA = 0;
      for (let sy = 0; sy < ss; sy++) {
        const py = y + (sy + 0.5) / ss;
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss;
          const [sr, sg, sb, sa] = sampleIcon(px, py, size);
          accR += sr;
          accG += sg;
          accB += sb;
          accA += sa;
        }
      }
      const alpha = Math.round(accA / totalSamples);
      if (alpha === 0) {
        row.push([0, 0, 0, 0]);
      } else {
        row.push([
          Math.round(accR / totalSamples),
          Math.round(accG / totalSamples),
          Math.round(accB / totalSamples),
          alpha
        ]);
      }
    }
    pixels.push(row);
  }
  return pixels;
}

function renderIconPng(size, pixels) {
  if (!pixels) pixels = renderIconPixels(size);
  const rowBytes = 1 + size * 4;
  const raw = Buffer.alloc(rowBytes * size);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowBytes;
    raw[rowOffset] = 0; // Filter byte: None
    for (let x = 0; x < size; x++) {
      const p = pixels[y][x];
      const offset = rowOffset + 1 + x * 4;
      raw[offset] = p[0];
      raw[offset + 1] = p[1];
      raw[offset + 2] = p[2];
      raw[offset + 3] = p[3];
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend]);
}

/**
 * Creates standard 32-bit uncompressed DIB for ICO format
 * Universally supported by all Win32 APIs, GDI, shell, and taskbars
 */
function renderIconDib(size, pixels) {
  if (!pixels) pixels = renderIconPixels(size);
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0); // biSize
  header.writeInt32LE(size, 4); // biWidth
  header.writeInt32LE(size * 2, 8); // biHeight * 2 (XOR + AND mask)
  header.writeUInt16LE(1, 12); // biPlanes
  header.writeUInt16LE(32, 14); // biBitCount
  header.writeUInt32LE(0, 16); // biCompression (BI_RGB)

  const xorSize = size * size * 4;
  const maskRowBytes = Math.ceil(size / 32) * 4;
  const andSize = maskRowBytes * size;
  header.writeUInt32LE(xorSize + andSize, 20); // biSizeImage

  const xorBuf = Buffer.alloc(xorSize);
  // DIB is stored bottom-to-top
  for (let dy = 0; dy < size; dy++) {
    const srcY = size - 1 - dy;
    for (let x = 0; x < size; x++) {
      const p = pixels[srcY][x];
      const offset = (dy * size + x) * 4;
      xorBuf[offset] = p[2];     // Blue
      xorBuf[offset + 1] = p[1]; // Green
      xorBuf[offset + 2] = p[0]; // Red
      xorBuf[offset + 3] = p[3]; // Alpha
    }
  }

  // 1-bit AND mask: 0 = visible/not masked out
  const andBuf = Buffer.alloc(andSize, 0);
  return Buffer.concat([header, xorBuf, andBuf]);
}

function buildUniversalIco(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type = 1
  header.writeUInt16LE(count, 4); // Number of images

  let offset = 6 + count * 16;
  const dirEntries = [];
  for (const item of entries) {
    const entry = Buffer.alloc(16);
    entry[0] = (item.size >= 256) ? 0 : item.size;
    entry[1] = (item.size >= 256) ? 0 : item.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(item.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += item.buffer.length;
    dirEntries.push(entry);
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map(b => b.buffer)]);
}

const resDir = path.resolve(__dirname, '../resources');
if (!fs.existsSync(resDir)) fs.mkdirSync(resDir, { recursive: true });

console.log('Rendering high quality multi-resolution icons...');

// Sizes for complete Windows support:
// 16: Titlebar, small tray, notification area
// 32: Taskbar, high-DPI tray, desktop list
// 48: Desktop small icons, Explorer medium
// 64: High-DPI taskbar / Explorer large
// 128: Explorer extra-large
// 256: Explorer jumbo / modern Windows app icon
const sizes = [256, 128, 64, 48, 32, 16];
const iconData = {};

for (const s of sizes) {
  const pixels = renderIconPixels(s);
  const pngBuf = renderIconPng(s, pixels);
  // DIB for <= 64 for 100% native Win32/GDI compatibility, PNG for >= 128
  const icoBuf = (s <= 64) ? renderIconDib(s, pixels) : pngBuf;
  iconData[s] = { pixels, pngBuf, icoBuf };
  console.log(`Rendered size ${s}x${s} (PNG: ${pngBuf.length}b, ICO frame: ${icoBuf.length}b)`);
}

const p256 = iconData[256].pngBuf;
const p32 = iconData[32].pngBuf;
const p16 = iconData[16].pngBuf;

const icoEntries = sizes.map(s => ({ size: s, buffer: iconData[s].icoBuf }));
const ico = buildUniversalIco(icoEntries);

fs.writeFileSync(path.join(resDir, 'icon.png'), p256);
fs.writeFileSync(path.join(resDir, 'tray-icon.png'), p32);
fs.writeFileSync(path.join(resDir, 'tray-icon-16.png'), p16);
fs.writeFileSync(path.join(resDir, 'icon.ico'), ico);

console.log('Saved to resources/:');
console.log(' - icon.png (' + p256.length + ' bytes)');
console.log(' - tray-icon.png (' + p32.length + ' bytes)');
console.log(' - tray-icon-16.png (' + p16.length + ' bytes)');
console.log(' - icon.ico (' + ico.length + ' bytes)');
console.log('B64_32_VAL');
console.log(p32.toString('base64'));
