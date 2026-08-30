import { describe, expect, it } from "vitest";
import { LOOKS, SITE } from "./looks";
import { TEXTURE_BY_ID } from "./filters";
import { decodeRecipe } from "../lib/recipe";

describe("look page integrity", () => {
  it("documents a distinct, real effect per page", () => {
    const ids = LOOKS.map((look) => look.textureId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const look of LOOKS) {
      expect(TEXTURE_BY_ID[look.textureId], look.slug).toBeDefined();
    }
  });

  it("uses URL-safe, unique slugs", () => {
    const slugs = LOOKS.map((look) => look.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug, slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("names pages after search terms rather than invented brand names", () => {
    /* A page called /looks/isoform would never be found. Every slug must read as
       something a designer would actually type. */
    const brandNames = Object.values(TEXTURE_BY_ID).map((texture) => texture.label.toLowerCase().replace(/\s+/g, "-"));
    for (const look of LOOKS) {
      expect(brandNames, `slug ${look.slug} reuses a brand name`).not.toContain(look.slug);
    }
  });

  it("carries a recipe that decodes to the documented effect's defaults", () => {
    for (const look of LOOKS) {
      const decoded = decodeRecipe(look.recipe);
      expect(decoded, look.slug).not.toBeNull();
      expect(decoded?.textureId, look.slug).toBe(look.textureId);
      expect(decoded?.settings, look.slug).toEqual(TEXTURE_BY_ID[look.textureId].defaults);
    }
  });

  it("keeps the page job label identical to the catalog's", () => {
    for (const look of LOOKS) {
      expect(look.job, look.slug).toBe(TEXTURE_BY_ID[look.textureId].job);
    }
  });
});

describe("look page substance", () => {
  /* These thresholds exist so the page set cannot quietly degrade into thin
     programmatic filler. A look with nothing real to say should have no page. */
  it("explains how the effect actually works, in several specific steps", () => {
    for (const look of LOOKS) {
      expect(look.how.length, look.slug).toBeGreaterThanOrEqual(3);
      for (const step of look.how) {
        expect(step.length, `${look.slug}: "${step}"`).toBeGreaterThan(80);
      }
    }
  });

  it("documents what each control changes for this specific effect", () => {
    for (const look of LOOKS) {
      expect(look.controls.length, look.slug).toBeGreaterThanOrEqual(3);
      for (const [name, detail] of look.controls) {
        expect(name.length, look.slug).toBeGreaterThan(2);
        expect(detail.length, `${look.slug}: ${name}`).toBeGreaterThan(40);
      }
    }
  });

  it("states both what it suits and what it does not", () => {
    for (const look of LOOKS) {
      expect(look.goodFor.length, look.slug).toBeGreaterThanOrEqual(2);
      expect(look.notFor.length, look.slug).toBeGreaterThan(40);
    }
  });

  it("writes genuinely different prose for every page", () => {
    const intros = LOOKS.map((look) => look.intro);
    expect(new Set(intros).size).toBe(intros.length);
    const summaries = LOOKS.map((look) => look.summary);
    expect(new Set(summaries).size).toBe(summaries.length);
    /* No two pages may share a "how it works" step verbatim. */
    const steps = LOOKS.flatMap((look) => look.how);
    expect(new Set(steps).size).toBe(steps.length);
  });

  it("keeps titles and summaries within useful search-result lengths", () => {
    for (const look of LOOKS) {
      expect(look.title.length, look.slug).toBeLessThanOrEqual(70);
      expect(look.summary.length, look.slug).toBeGreaterThan(60);
      expect(look.summary.length, look.slug).toBeLessThanOrEqual(200);
    }
  });
});

describe("site constants", () => {
  it("canonicalises to the product's own domain", () => {
    expect(SITE.origin).toBe("https://grainstudio.harshith.com");
    expect(SITE.origin.endsWith("/")).toBe(false);
  });
});
