import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");

describe("Grain Studio product metadata", () => {
  it("uses the branded product URL as its canonical and social destination", () => {
    expect(indexHtml).toContain('rel="canonical" href="https://grainstudio.harshith.com/"');
    expect(indexHtml).toContain('property="og:url" content="https://grainstudio.harshith.com/"');
  });
});
