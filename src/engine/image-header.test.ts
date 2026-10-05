import { describe, expect, it, vi } from "vitest";
import { loadImageFile } from "./image";
import { readImageDimensions } from "./image-dimensions";

const png = (width: number, height: number) => {
  const bytes = new Uint8Array(33);
  bytes.set([137,80,78,71,13,10,26,10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8,13); bytes.set([73,72,68,82],12);
  view.setUint32(16,width); view.setUint32(20,height);
  return {type:'image/png',size:bytes.length,name:'header-only.png',slice:(start?:number,end?:number)=>new Blob([bytes.slice(start,end)])} as File;
};

describe("image decode admission", () => {
  it("rejects an oversized PNG from its header before creating a browser image", async () => {
    await expect(loadImageFile(png(20000,20000))).rejects.toThrow(/100 MP/);
  });

  it("rejects a zero-sized PNG header before allocating a bitmap", async () => {
    await expect(loadImageFile(png(0,200))).rejects.toThrow(/dimensions|header|image/i);
  });
});

const jpeg = new Uint8Array([
  255, 216,
  255, 225, 0, 6, 255, 192, 0, 0,
  255, 196, 0, 4, 255, 192,
  255, 255, 192, 0, 11, 8, 0, 100, 0, 200, 1, 1, 17, 0,
]);

const webp = (chunks: Array<[string, number[]]>) => {
  const length = chunks.reduce((total, [, payload]) => total + 8 + payload.length + (payload.length & 1), 12);
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  bytes.set([82, 73, 70, 70], 0);
  view.setUint32(4, length - 8, true);
  bytes.set([87, 69, 66, 80], 8);
  let offset = 12;
  for (const [kind, payload] of chunks) {
    bytes.set(Array.from(kind, (char) => char.charCodeAt(0)), offset);
    view.setUint32(offset + 4, payload.length, true);
    bytes.set(payload, offset + 8);
    offset += 8 + payload.length + (payload.length & 1);
  }
  return bytes;
};

describe("bounded image headers", () => {
  it("reads at most 1 MiB before admitting a file", async () => {
    const file = {
      type: "image/png", size: 50 * 1024 * 1024, name: "bad.png",
      slice: vi.fn(() => new Blob([new Uint8Array([137])])),
    } as unknown as File;
    await expect(loadImageFile(file)).rejects.toThrow(/PNG image header/i);
    expect(file.slice).toHaveBeenCalledWith(0, 1024 * 1024);
  });

  it("skips JPEG metadata, Huffman segments, and marker padding", () => {
    expect(readImageDimensions(jpeg, "image/jpeg")).toEqual({ width: 200, height: 100 });
    expect(() => readImageDimensions(jpeg.slice(0, -1), "image/jpeg")).toThrow(/JPEG image header/i);
  });

  it("reads padded WebP chunks and all three dimension encodings", () => {
    const vp8 = [0, 0, 0, 157, 1, 42, 64, 1, 240, 0];
    const padded = webp([["JUNK", [7]], ["VP8 ", vp8]]);
    expect(readImageDimensions(padded, "image/webp")).toEqual({ width: 320, height: 240 });
    expect(readImageDimensions(webp([["VP8L", [47, 99, 64, 12, 0]]]), "image/webp")).toEqual({ width: 100, height: 50 });
    expect(readImageDimensions(webp([["VP8X", [0, 0, 0, 0, 143, 1, 0, 43, 1, 0]]]), "image/webp")).toEqual({ width: 400, height: 300 });
    expect(() => readImageDimensions(padded.slice(0, 21), "image/webp")).toThrow(/WebP image header/i);
  });
});
