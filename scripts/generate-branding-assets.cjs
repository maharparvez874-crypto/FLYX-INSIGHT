const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);

    let crc = 0 ^ -1;
    for (let i = 4; i < 8 + len; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc ^ byte) & 1 ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    crc = (crc ^ -1) >>> 0;
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    scanlines[y * (1 + width * 4)] = 0; // Filter 0 (None)
    rgbaBuffer.copy(scanlines, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idatData = zlib.deflateSync(scanlines, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Generate circular emblem at any resolution
function renderCircularEmblem(size) {
  const w = size;
  const h = size;
  const buf = Buffer.alloc(w * h * 4);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const maxR = (size / 2) * 0.96;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1.02) {
        buf[idx + 3] = 0; // Transparent
        continue;
      }

      // Smooth anti-aliased edge
      const edgeAlpha = clamp(1 - (dist - 1.0) / 0.02, 0, 1);

      // 1. Base Gradient Disc (Deep Royal Navy / Cosmic Slate)
      const gradT = clamp((dy + 0.6) / 1.6, 0, 1);
      let r = 10 + (1 - gradT) * 16;
      let g = 17 + (1 - gradT) * 22;
      let b = 32 + (1 - gradT) * 36;
      let a = 255;

      // 2. Concentric Orbit Rings
      // Outer Gold Ring (0.92 to 0.98)
      if (dist >= 0.92 && dist <= 0.98) {
        const ringT = (dist - 0.92) / 0.06;
        const bell = Math.sin(ringT * Math.PI);
        const goldR = 255;
        const goldG = 184 + Math.round(bell * 40);
        const goldB = Math.round(bell * 50);
        r = r * (1 - bell) + goldR * bell;
        g = g * (1 - bell) + goldG * bell;
        b = b * (1 - bell) + goldB * bell;
      }

      // Inner Cyan Dashed Orbit (0.83 to 0.87)
      if (dist >= 0.83 && dist <= 0.87) {
        const angle = Math.atan2(dy, dx);
        const dash = Math.sin(angle * 14);
        if (dash > 0) {
          const cyanR = 0;
          const cyanG = 242;
          const cyanB = 254;
          const factor = dash * 0.85;
          r = r * (1 - factor) + cyanR * factor;
          g = g * (1 - factor) + cyanG * factor;
          b = b * (1 - factor) + cyanB * factor;
        }
      }

      // 3. Central Hexagonal Crest / Winged Core
      // Hexagon distance approximation
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const hexDist = Math.max(absX * 0.866025 + absY * 0.5, absY);

      if (hexDist <= 0.72) {
        // Hexagon border
        if (hexDist >= 0.66) {
          const hexFactor = clamp(1 - Math.abs(hexDist - 0.69) / 0.03, 0, 1);
          r = r * (1 - hexFactor) + 255 * hexFactor;
          g = g * (1 - hexFactor) + 184 * hexFactor;
          b = b * (1 - hexFactor) + 0 * hexFactor;
        } else {
          // Inside hexagon - darker crystalline background
          r = 7;
          g = 13;
          b = 26;
        }
      }

      // 4. Stylized FLYX Geometric Wings & Diamond Core
      // Upper Wing ("F" top blade)
      if (dy >= -0.58 && dy <= -0.32 && Math.abs(dx) <= 0.48 - (dy + 0.58) * 0.4) {
        const wingT = (dx + 0.48) / 0.96;
        r = 255;
        g = 184 + Math.round(wingT * 40);
        b = Math.round(wingT * 60);
      }

      // Center Diamond Core (Insight Aperture)
      const diamondDist = Math.abs(dx) + Math.abs(dy);
      if (diamondDist <= 0.22) {
        if (diamondDist <= 0.08) {
          // Electric Cyan Aperture Star
          r = 0;
          g = 242;
          b = 254;
          if (diamondDist <= 0.035) {
            // White core spark
            r = 255;
            g = 255;
            b = 255;
          }
        } else {
          // Gold Diamond Facet
          r = 255;
          g = 190;
          b = 30;
        }
      }

      // Lower Wings ("X" blades)
      if (dy >= 0.12 && dy <= 0.54) {
        const bladeLeft = dx >= -0.42 && dx <= -0.06 && Math.abs(dy - (-dx)) < 0.16;
        const bladeRight = dx >= 0.06 && dx <= 0.42 && Math.abs(dy - dx) < 0.16;
        if (bladeLeft) {
          // Cyan Blade
          r = 0;
          g = 210;
          b = 255;
        } else if (bladeRight) {
          // Gold Blade
          r = 255;
          g = 184;
          b = 0;
        }
      }

      // 5. Specular Dome Highlight (Top Glass Shine)
      if (dy < 0 && dist < 0.88) {
        const shine = clamp(Math.pow((0.88 - dist) * (1 - Math.abs(dx)), 1.2) * 0.35, 0, 1);
        r = Math.min(255, r + Math.round(shine * 220));
        g = Math.min(255, g + Math.round(shine * 230));
        b = Math.min(255, b + Math.round(shine * 255));
      }

      buf[idx] = Math.round(r);
      buf[idx + 1] = Math.round(g);
      buf[idx + 2] = Math.round(b);
      buf[idx + 3] = Math.round(a * edgeAlpha);
    }
  }

  return encodePng(w, h, buf);
}

// Generate OpenGraph 1200x630 Card
function renderOgCard() {
  const w = 1200;
  const h = 630;
  const buf = Buffer.alloc(w * h * 4);

  // 1. Dark Cyber Slate Background with Radial Glows
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // Ambient gradient
      const t = (x / w) * 0.6 + (y / h) * 0.4;
      let r = 7 + t * 6;
      let g = 11 + t * 9;
      let b = 20 + t * 18;

      // Gold Glow around (260, 315)
      const dxGold = (x - 260) / 300;
      const dyGold = (y - 315) / 300;
      const dGold = Math.sqrt(dxGold * dxGold + dyGold * dyGold);
      if (dGold < 1) {
        const gFactor = Math.pow(1 - dGold, 2) * 0.35;
        r += 255 * gFactor;
        g += 184 * gFactor;
      }

      // Cyan Glow around (950, 200)
      const dxCyan = (x - 950) / 350;
      const dyCyan = (y - 200) / 350;
      const dCyan = Math.sqrt(dxCyan * dxCyan + dyCyan * dyCyan);
      if (dCyan < 1) {
        const cFactor = Math.pow(1 - dCyan, 2) * 0.22;
        g += 200 * cFactor;
        b += 254 * cFactor;
      }

      // Subtle Grid
      if (x % 50 === 0 || y % 50 === 0) {
        r += 5;
        g += 8;
        b += 14;
      }

      // Border frame
      if (x === 24 || x === w - 24 || y === 24 || y === h - 24) {
        r = 212;
        g = 175;
        b = 55;
      }

      buf[idx] = clamp(Math.round(r), 0, 255);
      buf[idx + 1] = clamp(Math.round(g), 0, 255);
      buf[idx + 2] = clamp(Math.round(b), 0, 255);
      buf[idx + 3] = 255;
    }
  }

  // 2. Render circular emblem onto the card at (100, 155) size 320x320
  const emblemSize = 320;
  const emblemX = 80;
  const emblemY = 155;
  const cx = (emblemSize - 1) / 2;
  const cy = (emblemSize - 1) / 2;
  const maxR = (emblemSize / 2) * 0.96;

  for (let ey = 0; ey < emblemSize; ey++) {
    for (let ex = 0; ex < emblemSize; ex++) {
      const targetX = emblemX + ex;
      const targetY = emblemY + ey;
      if (targetX >= w || targetY >= h) continue;

      const dx = (ex - cx) / maxR;
      const dy = (ey - cy) / maxR;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1.0) continue;

      const edgeAlpha = clamp(1 - (dist - 0.98) / 0.02, 0, 1);
      const targetIdx = (targetY * w + targetX) * 4;

      let r = 11, g = 18, b = 34;

      if (dist >= 0.92 && dist <= 0.98) {
        r = 255; g = 184; b = 0;
      } else if (dist >= 0.84 && dist <= 0.88) {
        r = 0; g = 242; b = 254;
      } else {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const hexDist = Math.max(absX * 0.866025 + absY * 0.5, absY);
        if (hexDist <= 0.7) {
          if (hexDist >= 0.65) {
            r = 255; g = 184; b = 0;
          } else {
            r = 8; g = 14; b = 27;
          }
        }
        if (dy >= -0.55 && dy <= -0.32 && Math.abs(dx) <= 0.45) {
          r = 255; g = 190; b = 20;
        }
        const dDiamond = Math.abs(dx) + Math.abs(dy);
        if (dDiamond <= 0.2) {
          if (dDiamond <= 0.08) {
            r = 0; g = 242; b = 254;
          } else {
            r = 255; g = 184; b = 0;
          }
        }
        if (dy >= 0.12 && dy <= 0.5) {
          if (dx < 0 && Math.abs(dy - (-dx)) < 0.15) {
            r = 0; g = 220; b = 255;
          } else if (dx > 0 && Math.abs(dy - dx) < 0.15) {
            r = 255; g = 184; b = 0;
          }
        }
      }

      const currentR = buf[targetIdx];
      const currentG = buf[targetIdx + 1];
      const currentB = buf[targetIdx + 2];

      buf[targetIdx] = Math.round(currentR * (1 - edgeAlpha) + r * edgeAlpha);
      buf[targetIdx + 1] = Math.round(currentG * (1 - edgeAlpha) + g * edgeAlpha);
      buf[targetIdx + 2] = Math.round(currentB * (1 - edgeAlpha) + b * edgeAlpha);
    }
  }

  return encodePng(w, h, buf);
}

// Ensure public directory exists
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating FLYX INSIGHT branding assets...');

// 1. Favicon 16x16
const fav16 = renderCircularEmblem(16);
fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), fav16);
console.log('✓ /public/favicon-16x16.png (' + fav16.length + ' bytes)');

// 2. Favicon 32x32
const fav32 = renderCircularEmblem(32);
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), fav32);
console.log('✓ /public/favicon-32x32.png (' + fav32.length + ' bytes)');

// 3. Apple Touch Icon 180x180
const touchIcon = renderCircularEmblem(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), touchIcon);
console.log('✓ /public/apple-touch-icon.png (' + touchIcon.length + ' bytes)');

// 4. Logo 512x512
const logoPng = renderCircularEmblem(512);
fs.writeFileSync(path.join(publicDir, 'logo.png'), logoPng);
console.log('✓ /public/logo.png (' + logoPng.length + ' bytes)');

// 5. OpenGraph 1200x630
const ogPng = renderOgCard();
fs.writeFileSync(path.join(publicDir, 'logo-og.png'), ogPng);
console.log('✓ /public/logo-og.png (' + ogPng.length + ' bytes)');

console.log('All PNG branding assets successfully generated!');
