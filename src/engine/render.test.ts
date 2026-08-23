import { describe, expect, it } from "vitest";
import { TEXTURE_BY_ID } from "../data/filters";
import type { TextureId } from "../types";
import { applyPixelTexture } from "./render";

const pixelTextures: TextureId[] = [
  "riso-print",
  "bayer-grain",
  "cobalt-dust",
  "denim-dust",
  "harbor-dust",
  "meadow-dust",
  "paper-fiber",
  "watercolor",
  "sumi-wash",
  "blueprint",
];

function fixture(width = 6, height = 5) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    data[index] = (pixel * 31) % 256;
    data[index + 1] = (pixel * 53) % 256;
    data[index + 2] = (pixel * 79) % 256;
    data[index + 3] = 255;
  }
  return data;
}

describe("pixel texture processors", () => {
  it.each(pixelTextures)("renders %s deterministically without mutating the source", (id) => {
    const source = fixture();
    const before = new Uint8ClampedArray(source);
    const settings = TEXTURE_BY_ID[id].defaults;
    const first = applyPixelTexture(source, 6, 5, id, settings);
    const second = applyPixelTexture(source, 6, 5, id, settings);

    expect(first).toHaveLength(source.length);
    expect(Array.from(source)).toEqual(Array.from(before));
    expect(Array.from(first)).toEqual(Array.from(second));
    expect(first.some((value, index) => index % 4 !== 3 && value !== source[index])).toBe(true);
    for (let index = 3; index < first.length; index += 4) expect(first[index]).toBe(255);
  });
});
