const fs = require("fs");
const path = require("path");

function createPNG(size) {
  const bgColor = { r: 124, g: 58, b: 237 }; // #7c3aed
  const width = size;
  const height = size;

  // Create a minimal valid PNG with solid purple background and a white "C" letter shape
  const { Buffer } = require("buffer");
  const zlib = require("zlib");

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = createChunk("IHDR", ihdrData);

  // IDAT chunk - raw pixel data
  const rawData = Buffer.alloc(height * (1 + width * 3));

  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.38;
  const innerR = width * 0.24;
  const gapAngle = Math.PI / 4; // opening angle for the "C"

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 3);
    rawData[rowOffset] = 0; // filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Check if pixel is in the "C" shape
      const inRing = dist >= innerR && dist <= outerR;
      const inGap = angle > -gapAngle && angle < gapAngle;
      const isC = inRing && !inGap;

      // Rounded rectangle background check
      const cornerRadius = width * 0.18;
      const inRect = isInRoundedRect(x, y, width, height, cornerRadius);

      if (!inRect) {
        // Transparent area (white for PNG without alpha)
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
      } else if (isC) {
        // White C letter
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
      } else {
        // Purple background
        rawData[pixelOffset] = bgColor.r;
        rawData[pixelOffset + 1] = bgColor.g;
        rawData[pixelOffset + 2] = bgColor.b;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk("IDAT", compressed);

  // IEND chunk
  const iend = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function isInRoundedRect(x, y, w, h, r) {
  if (x < r && y < r) return dist(x, y, r, r) <= r;
  if (x > w - r && y < r) return dist(x, y, w - r, r) <= r;
  if (x < r && y > h - r) return dist(x, y, r, h - r) <= r;
  if (x > w - r && y > h - r) return dist(x, y, w - r, h - r) <= r;
  return true;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const iconsDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(iconsDir, { recursive: true });

[192, 512].forEach((size) => {
  const png = createPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png`);
});
