/**
 * Renders resources/icon.svg into every raster icon the app ships:
 *   icon.png (512), tray-icon.png (32), tray-icon-16.png (16), icon.ico (16–256).
 *
 * Runs inside Electron so Chromium does the SVG rasterising:
 *   npm run icons
 * Optional: pass a different SVG and output dir (used for previews):
 *   electron scripts/generate-icons.cjs <svg> <outDir>
 */
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const svgPath = path.resolve(process.argv[2] || path.join(__dirname, '../resources/icon.svg'))
const outDir = path.resolve(process.argv[3] || path.join(__dirname, '../resources'))
const ICO_SIZES = [256, 128, 64, 48, 32, 24, 20, 16]
const PNG_SIZES = [512, 32, 16]

/** 32-bit BGRA DIB frame — the most widely supported ICO payload for small sizes. */
function dibFrame(size, rgba) {
  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0)
  header.writeInt32LE(size, 4)
  header.writeInt32LE(size * 2, 8) // XOR + AND mask height
  header.writeUInt16LE(1, 12)
  header.writeUInt16LE(32, 14)
  const maskRow = Math.ceil(size / 32) * 4
  header.writeUInt32LE(size * size * 4 + maskRow * size, 20)
  const xor = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * size * 4 // DIBs are stored bottom-up
    for (let x = 0; x < size; x++) {
      const s = src + x * 4
      const d = (y * size + x) * 4
      xor[d] = rgba[s + 2]
      xor[d + 1] = rgba[s + 1]
      xor[d + 2] = rgba[s]
      xor[d + 3] = rgba[s + 3]
    }
  }
  return Buffer.concat([header, xor, Buffer.alloc(maskRow * size)])
}

function buildIco(frames) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(frames.length, 4)
  let offset = 6 + frames.length * 16
  const dir = frames.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...dir, ...frames.map((f) => f.data)])
}

async function main() {
  const svg = fs.readFileSync(svgPath, 'utf8')
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await win.loadURL('data:text/html,<!doctype html><body></body>')
  const sizes = [...new Set([...ICO_SIZES, ...PNG_SIZES])]
  const rendered = await win.webContents.executeJavaScript(`(async () => {
    const svg = ${JSON.stringify(svg)};
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    await img.decode();
    const out = {};
    for (const size of ${JSON.stringify(sizes)}) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, size, size);
      out[size] = {
        png: c.toDataURL('image/png').split(',')[1],
        rgba: Array.from(ctx.getImageData(0, 0, size, size).data)
      };
    }
    return out;
  })()`)

  fs.mkdirSync(outDir, { recursive: true })
  const png = (s) => Buffer.from(rendered[s].png, 'base64')
  fs.writeFileSync(path.join(outDir, 'icon.png'), png(512))
  fs.writeFileSync(path.join(outDir, 'tray-icon.png'), png(32))
  fs.writeFileSync(path.join(outDir, 'tray-icon-16.png'), png(16))
  const frames = ICO_SIZES.map((size) => ({
    size,
    data: size >= 128 ? png(size) : dibFrame(size, rendered[size].rgba)
  }))
  fs.writeFileSync(path.join(outDir, 'icon.ico'), buildIco(frames))
  console.log(`Icons written to ${outDir}`)
  console.log(`tray fallback (32px base64):\n${rendered[32].png}`)
}

app.whenReady().then(main).then(
  () => app.quit(),
  (err) => {
    console.error(err)
    app.exit(1)
  }
)
