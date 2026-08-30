import { describe, expect, it } from "vitest";
import {
  PALETTES,
  STARTER_TEXTURES,
  STARTER_TEXTURE_IDS,
  TEXTURES,
  TEXTURE_BY_ID,
  TEXTURE_CATEGORIES,
  texturesForFilter,
} from "./filters";

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

describe("plain-language naming", () => {
  it("gives every effect an ordinary-language job label", () => {
    for (const texture of TEXTURES) {
      expect(texture.job.length, texture.id).toBeGreaterThan(2);
      // The job must add information rather than repeat the brand name.
      expect(texture.job.toLowerCase(), texture.id).not.toBe(texture.label.toLowerCase());
    }
  });

  it("does not let two effects claim the same job", () => {
    const jobs = TEXTURES.map((texture) => texture.job.toLowerCase());
    expect(new Set(jobs).size).toBe(jobs.length);
  });

  it("covers the search terms designers actually use", () => {
    const jobs = TEXTURES.map((texture) => texture.job.toLowerCase()).join(" | ");
    for (const term of ["halftone", "dither", "risograph", "paper texture", "cyanotype", "pixelate", "ascii", "mosaic", "engraving", "watercolor"]) {
      expect(jobs, term).toContain(term);
    }
  });
});

describe("progressive disclosure", () => {
  it("opens on a small curated set instead of the whole catalog", () => {
    expect(STARTER_TEXTURE_IDS).toHaveLength(6);
    expect(new Set(STARTER_TEXTURE_IDS).size).toBe(STARTER_TEXTURE_IDS.length);
    expect(STARTER_TEXTURES.every(Boolean)).toBe(true);
    expect(STARTER_TEXTURES.length).toBeLessThan(TEXTURES.length / 3);
  });

  it("offers Start here as the first group, with the full catalog one click away", () => {
    expect(TEXTURE_CATEGORIES[0]).toBe("Start here");
    expect(TEXTURE_CATEGORIES).toContain("All");
  });

  it("resolves every group to a non-empty selection", () => {
    for (const filter of TEXTURE_CATEGORIES) {
      expect(texturesForFilter(filter).length, filter).toBeGreaterThan(0);
    }
    expect(texturesForFilter("All")).toBe(TEXTURES);
    expect(texturesForFilter("Start here")).toBe(STARTER_TEXTURES);
    expect(texturesForFilter("Paint").every((texture) => texture.category === "Paint")).toBe(true);
  });
});
