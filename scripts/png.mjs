// Small PNG helpers for render_pngs.mjs and the logo tests: read the chunks, add a tEXt
// chunk, and decode the 8-bit RGBA, non-interlaced files that resvg writes.

import { crc32, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Returns [{ type, data }] for every chunk. Throws on a bad signature, a truncated
// chunk or a CRC mismatch.
export function readChunks(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG file');
  const chunks = [];
  let at = 8;
  while (at < buf.length) {
    if (at + 12 > buf.length) throw new Error('truncated PNG chunk');
    const len = buf.readUInt32BE(at);
    const type = buf.toString('latin1', at + 4, at + 8);
    if (at + 12 + len > buf.length) throw new Error(`truncated PNG chunk ${type}`);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (crc32(buf.subarray(at + 4, at + 8 + len)) !== buf.readUInt32BE(at + 8 + len)) {
      throw new Error(`bad CRC in PNG chunk ${type}`);
    }
    chunks.push({ type, data });
    at += 12 + len;
    if (type === 'IEND') break;
  }
  if (chunks[0]?.type !== 'IHDR' || chunks.at(-1)?.type !== 'IEND') throw new Error('PNG without IHDR or IEND');
  return chunks;
}

export function ihdr(buf) {
  const d = readChunks(buf)[0].data;
  return { width: d.readUInt32BE(0), height: d.readUInt32BE(4), bitDepth: d[8], colorType: d[9], interlace: d[12] };
}

// The tEXt chunks as { keyword: text }.
export function textChunks(buf) {
  const out = {};
  for (const { type, data } of readChunks(buf)) {
    if (type !== 'tEXt') continue;
    const nul = data.indexOf(0);
    out[data.toString('latin1', 0, nul)] = data.toString('latin1', nul + 1);
  }
  return out;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

// Returns the PNG with a tEXt chunk keyword=text right after IHDR.
export function withText(buf, keyword, text) {
  readChunks(buf);
  const ihdrEnd = 8 + 12 + buf.readUInt32BE(8);
  const data = Buffer.concat([Buffer.from(keyword, 'latin1'), Buffer.from([0]), Buffer.from(text, 'latin1')]);
  return Buffer.concat([buf.subarray(0, ihdrEnd), chunk('tEXt', data), buf.subarray(ihdrEnd)]);
}

// Decodes an 8-bit RGBA, non-interlaced PNG to { width, height, data } (straight alpha).
export function decodeRGBA(buf) {
  const chunks = readChunks(buf);
  const { width, height, bitDepth, colorType, interlace } = ihdr(buf);
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`unsupported PNG: bit depth ${bitDepth}, colour type ${colorType}, interlace ${interlace}`);
  }
  const raw = inflateSync(Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data)));
  const bpp = 4;
  const stride = width * bpp;
  if (raw.length !== height * (stride + 1)) throw new Error('PNG image data has the wrong length');
  const data = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = data.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? data.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = 0; break;
        case 1: v = a; break;
        case 2: v = b; break;
        case 3: v = (a + b) >> 1; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`unknown PNG filter ${filter}`);
      }
      out[x] = (line[x] + v) & 0xff;
    }
  }
  return { width, height, data };
}
