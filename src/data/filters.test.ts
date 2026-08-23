import { describe, expect, it } from "vitest";
import { PALETTES, TEXTURES, TEXTURE_BY_ID } from "./filters";

describe("texture catalog", () => {
  it("ships a complete 25-effect catalog", () => {
    expect(TEXTURES).toHaveLength(25);
    expect(new Set(TEXTURES.map((texture) => texture.id)).size).toBe(TEXTURES.length);
  });

  it("keeps every setting in its supported range", () => {
    for (const texture of TEXTURES) {
      expect(texture.defaults.intensity).toBeGreaterThanOrEqual(0);
      expect(texture.defaults.intensity).toBeLessThanOrEqual(100);
      expect(texture.defaults.detail).toBeGreaterThanOrEqual(0);
      expect(texture.defaults.detail).toBeLessThanOrEqual(100);
      expect(texture.defaults.contrast).toBeGreaterThanOrEqual(0);
      expect(texture.defaults.contrast).toBeLessThanOrEqual(100);
      expect(texture.defaults.scale).toBeGreaterThanOrEqual(4);
      expect(texture.defaults.scale).toBeLessThanOrEqual(32);
      expect(PALETTES[texture.defaults.palette]).toBeDefined();
      expect(TEXTURE_BY_ID[texture.id]).toBe(texture);
    }
  });
});
