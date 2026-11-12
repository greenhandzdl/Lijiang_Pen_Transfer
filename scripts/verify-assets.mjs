/**
 * Make accidental low-resolution/missing showcase assets a hard CI failure.
 * WebP lossless source geometry is read from the RIFF container (no dependencies).
 * Usage: npm run verify:assets
 */
import { readFileSync } from 'node:fs';

const manifest = [
  ['scene-day.webp', 2172, 724, 1_500_000],
  ['scene-dusk.webp', 2172, 724, 1_500_000],
  ['scene-night.webp', 2172, 724, 1_500_000],
  ['hero-front.webp', 523, 1536, 250_000],
  ['hero-side.webp', 366, 1505, 200_000],
  ['hero-back.webp', 499, 1519, 250_000],
  ['hero-walk.webp', 809, 1413, 250_000],
  ['hero-song.webp', 727, 1428, 250_000],
];

function getDimensions(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' ||
      buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw Error('Not a WebP RIFF image');
  }
  let offset = 12;
  while (offset + 8 < buffer.length) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const chunkLength = buffer.readUInt32LE(offset + 4);
    if (type === 'VP8L') {
      if (buffer[offset + 8] !== 0x2f) throw Error('Invalid VP8L signature');
      const bits = buffer.readUInt32LE(offset + 9);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >>> 14) & 0x3fff) + 1;
      return { width, height, lossless: true };
    }
    if (type === 'VP8X') {
      const width = buffer.readUIntLE(offset + 12, 3) + 1;
      const height = buffer.readUIntLE(offset + 15, 3) + 1;
      // Continue to VP8L and validate that compression really is lossless.
      const rest = buffer.subarray(offset + 8 + chunkLength + (chunkLength % 2));
      const next = getDimensionsForNested(rest);
      return { width, height, lossless: next };
    }
    offset += 8 + chunkLength + (chunkLength % 2);
  }
  throw Error('No VP8L data chunk found; must store display assets losslessly');
}

function getDimensionsForNested(buffer) {
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString('ascii', offset, offset + 4);
    if (type === 'VP8L') return true;
    const len = buffer.readUInt32LE(offset + 4);
    offset += 8 + len + (len % 2);
  }
  return false;
}

let ok = true;
for (const [filename, expectedWidth, expectedHeight, minBytes] of manifest) {
  try {
    const bytes = readFileSync(new URL(`../public/art/${filename}`, import.meta.url));
    const { width, height, lossless } = getDimensions(bytes);
    const good = width === expectedWidth && height === expectedHeight &&
      bytes.length >= minBytes && lossless;
    if (!good) ok = false;
    console.log(`${good ? 'OK' : 'FAIL'} ${filename}: ${width}x${height}, ${bytes.length.toLocaleString()} bytes, lossless=${lossless}`);
  } catch (error) {
    ok = false;
    console.error(`FAIL ${filename}: ${error.message}`);
  }
}
if (!ok) process.exitCode = 1;
/** New mini NPC overlays are intentionally small lossy-alpha WebP. Unlike the
 * three full paintings and five hero poses, their display size is ~150px,
 * so keeping 800px production sprites avoids blurry upscaling AND large payloads. */
const overlayAssets = [
  ['npc-fisher.webp', 780, 800, 214_360],
  ['npc-cormorant.webp', 800, 716, 219_282],
  ['npc-market.webp', 800, 763, 221_646],
  ['npc-nightboat.webp', 800, 467, 142_916],
];
for (const [filename, expectedWidth, expectedHeight, expectedSize] of overlayAssets) {
  try {
    const bytes = readFileSync(new URL(`../public/art/${filename}`, import.meta.url));
    const { width, height } = getDimensions(bytes);
    const good = width === expectedWidth && height === expectedHeight &&
      bytes.length >= 60_000 && bytes.length <= 260_000 &&
      bytes.length === expectedSize;
    if (!good) ok = false;
    console.log(`${good ? 'OK' : 'FAIL'} ${filename}: ${width}x${height}, ${bytes.length.toLocaleString()} bytes (compact overlay)`);
  } catch (error) {
    ok = false;
    console.error(`FAIL ${filename}: ${error.message}`);
  }
}

try {
  const bytes = readFileSync(new URL('../public/audio/night-river-original.mp3', import.meta.url));
  const isMp3 = bytes.toString('ascii', 0, 3) === 'ID3' ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  const good = isMp3 && bytes.length >= 70_000 && bytes.length <= 230_000;
  if (!good) ok = false;
  console.log(`${good ? 'OK' : 'FAIL'} night-river-original.mp3: ${bytes.length} bytes (original demo)`);
} catch (error) {
  ok = false;
  console.error(`FAIL night music: ${error.message}`);
}
if (!ok) process.exitCode = 1;
