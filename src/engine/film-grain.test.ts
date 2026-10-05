import { describe, expect, it } from "vitest";
import { TEXTURE_BY_ID } from "../data/filters";
import { applyPixelTexture } from "./render";
import type { TextureId, TextureSettings } from "../types";

const id = "film-grain" as TextureId;
const settings: TextureSettings = { intensity: 100, detail: 60, contrast: 50, scale: 8, palette: "source", seed: 17 };
const fixture = (width = 24, height = 16) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([90, 140, 170, (i / 4) % 3 === 0 ? 128 : 255], i);
  return data;
};

describe("natural film grain", () => {
  it("adds a distinctly named source-colour grain to the catalog", () => {
    expect(TEXTURE_BY_ID[id]).toBeDefined();
    expect(TEXTURE_BY_ID[id]?.defaults.palette).toBe("source");
  });

  it("adds neutral noise rather than replacing the image with a colour palette", () => {
    const source = fixture();
    const result = applyPixelTexture(source, 24, 16, id, settings);
    expect(result.some((v, i) => i % 4 !== 3 && v !== source[i])).toBe(true);
    for (let i = 0; i < result.length; i += 4) {
      expect(result[i + 1] - result[i]).toBe(50);
      expect(result[i + 2] - result[i + 1]).toBe(30);
      expect(result[i + 3]).toBe(source[i + 3]);
    }
  });

  it("keeps the original buffer untouched and is deterministic for the same seed", () => {
    const source = fixture();
    const original = new Uint8ClampedArray(source);
    expect(applyPixelTexture(source, 24, 16, id, settings)).toEqual(applyPixelTexture(source, 24, 16, id, settings));
    expect(source).toEqual(original);
  });

  it("reseed and grain size each produce a genuinely different pattern", () => {
    const source = fixture();
    const result = applyPixelTexture(source, 24, 16, id, settings);
    expect(applyPixelTexture(source, 24, 16, id, { ...settings, seed: 193 })).not.toEqual(result);
    expect(applyPixelTexture(source, 24, 16, id, { ...settings, scale: 30 })).not.toEqual(result);
  });
});
