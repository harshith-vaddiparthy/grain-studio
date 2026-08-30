import { describe, expect, it } from "vitest";
import { TEXTURES } from "../data/filters";
import {
  RECIPE_PATTERN,
  RECIPE_QUERY_KEY,
  decodeRecipe,
  encodeRecipe,
  readRecipeFromSearch,
  recipeLink,
} from "./recipe";

const settings = { intensity: 92, detail: 60, contrast: 58, scale: 11, palette: "ember", seed: 17 } as const;

describe("recipe links", () => {
  it("round-trips every catalog effect at its own defaults", () => {
    for (const texture of TEXTURES) {
      const decoded = decodeRecipe(encodeRecipe(texture.id, texture.defaults));
      expect(decoded).not.toBeNull();
      expect(decoded?.textureId).toBe(texture.id);
      expect(decoded?.settings).toEqual(texture.defaults);
    }
  });

  it("emits a compact, restricted character set that cannot carry free text", () => {
    for (const texture of TEXTURES) {
      const encoded = encodeRecipe(texture.id, texture.defaults);
      expect(encoded).toMatch(RECIPE_PATTERN);
      expect(encoded.length).toBeLessThan(48);
    }
  });

  it("encodes only effect and settings, never image or source data", () => {
    const encoded = encodeRecipe("riso-print", settings);
    expect(encoded).toBe("1.riso-print.92.60.58.11.ember.17");
    // Field count is fixed at eight, so no extra payload can ride along.
    expect(encoded.split(".")).toHaveLength(8);
  });

  it("rejects malformed, unknown, or hostile input instead of partially applying", () => {
    const rejected = [
      "",
      null,
      undefined,
      "2.riso-print.92.60.58.11.ember.17", // unsupported version
      "1.not-a-texture.92.60.58.11.ember.17", // unknown effect
      "1.riso-print.92.60.58.11.chartreuse.17", // unknown palette
      "1.riso-print.92.60.58.11.ember", // too few fields
      "1.riso-print.92.60.58.11.ember.17.9", // too many fields
      "1.riso-print.NaN.60.58.11.ember.17", // non-numeric
      "1.riso-print.9e9.60.58.11.ember.17", // exponent form
      "1.riso-print.92.60.58.11.ember.<script>", // injection attempt
      "1.riso-print.92.60.58.11.ember.17?x=1", // stray query
      "javascript:alert(1)",
    ];
    for (const value of rejected) {
      expect(decodeRecipe(value as string), `expected rejection: ${String(value)}`).toBeNull();
    }
  });

  it("clamps out-of-range values into supported bounds", () => {
    const decoded = decodeRecipe("1.riso-print.999.-40.58.99.ember.999999");
    expect(decoded?.settings.intensity).toBe(100);
    expect(decoded?.settings.detail).toBe(0);
    expect(decoded?.settings.scale).toBe(32);
    expect(decoded?.settings.seed).toBe(99_999);
  });

  it("builds a shareable link and drops every unrelated query parameter", () => {
    const link = recipeLink("https://grainstudio.harshith.com/", "riso-print", settings);
    expect(link).toBe("https://grainstudio.harshith.com/?r=1.riso-print.92.60.58.11.ember.17");
    expect(link).not.toContain("utm");
  });

  it("reads a recipe out of a query string and ignores other parameters", () => {
    const recipe = readRecipeFromSearch(`?utm_source=producthunt&${RECIPE_QUERY_KEY}=1.riso-print.92.60.58.11.ember.17`);
    expect(recipe?.textureId).toBe("riso-print");
    expect(recipe?.settings.palette).toBe("ember");
    expect(readRecipeFromSearch("?utm_source=producthunt")).toBeNull();
  });
});
