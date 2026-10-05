export function readImageDimensions(bytes: Uint8Array, type: string): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
  const fail = (format: string): never => {
    throw new Error(`This image has an invalid or incomplete ${format} image header.`);
  };
  const dimensions = (width: number, height: number, format: string) => {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) fail(format);
    return { width, height };
  };

  if (type === 'image/png') {
    if (bytes.length < 33 ||
        ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte) ||
        view.getUint32(8) !== 13 || tag(12) !== 'IHDR') fail('PNG');
    return dimensions(view.getUint32(16), view.getUint32(20), 'PNG');
  }

  if (type === 'image/jpeg') {
    if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) fail('JPEG');
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 255) fail('JPEG');
      while (offset < bytes.length && bytes[offset] === 255) offset++;
      if (offset >= bytes.length) fail('JPEG');
      const marker = bytes[offset++];
      if (marker === 0 || marker === 216 || marker === 217 || marker === 218) fail('JPEG');
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) fail('JPEG');
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) fail('JPEG');
      if ((marker >= 192 && marker <= 195) || (marker >= 197 && marker <= 199) ||
          (marker >= 201 && marker <= 203) || (marker >= 205 && marker <= 207)) {
        if (length < 8 || bytes[offset + 7] < 1 || length !== 8 + 3 * bytes[offset + 7]) fail('JPEG');
        return dimensions(view.getUint16(offset + 5), view.getUint16(offset + 3), 'JPEG');
      }
      offset += length;
    }
    fail('JPEG');
  }

  if (type === 'image/webp') {
    if (bytes.length < 20 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP') fail('WebP');
    const end = 8 + view.getUint32(4, true);
    if (end < 20) fail('WebP');
    let offset = 12;
    while (offset + 8 <= end) {
      if (offset + 8 > bytes.length) fail('WebP');
      const kind = tag(offset);
      const size = view.getUint32(offset + 4, true);
      const data = offset + 8;
      const next = data + size + (size & 1);
      if (next > end) fail('WebP');
      if (kind === 'VP8 ' || kind === 'VP8L' || kind === 'VP8X') {
        const minimum = kind === 'VP8L' ? 5 : 10;
        if (size < minimum || data + minimum > bytes.length) fail('WebP');
        if (kind === 'VP8 ') {
          if ((bytes[data] & 1) !== 0 || bytes[data + 3] !== 157 || bytes[data + 4] !== 1 || bytes[data + 5] !== 42) fail('WebP');
          return dimensions(view.getUint16(data + 6, true) & 0x3fff, view.getUint16(data + 8, true) & 0x3fff, 'WebP');
        }
        if (kind === 'VP8L') {
          if (bytes[data] !== 47) fail('WebP');
          return dimensions(
            1 + bytes[data + 1] + ((bytes[data + 2] & 63) << 8),
            1 + (bytes[data + 2] >> 6) + (bytes[data + 3] << 2) + ((bytes[data + 4] & 15) << 10),
            'WebP',
          );
        }
        return dimensions(
          1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16),
          1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16),
          'WebP',
        );
      }
      if (next > bytes.length) fail('WebP');
      offset = next;
    }
    fail('WebP');
  }

  throw new Error('This image has an unsupported image format.');
}
