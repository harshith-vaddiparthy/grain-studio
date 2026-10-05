import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");

describe("Grain Studio product metadata", () => {
  it("keeps the creator attribution in indexable metadata", () => {
    expect(indexHtml).toContain('name="author" content="Harshith Vaddiparthy"');
    expect(indexHtml).toContain("Grain Studio by Harshith Vaddiparthy");
    const block = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(block).not.toBeNull();
    expect(JSON.parse(block[1]).creator).toMatchObject({ "@type": "Person", name: "Harshith Vaddiparthy", url: "https://www.harshith.com/" });
  });

  it("uses the branded product URL as its canonical and social destination", () => {
    expect(indexHtml).toContain('rel="canonical" href="https://grainstudio.harshith.com/"');
    expect(indexHtml).toContain('property="og:url" content="https://grainstudio.harshith.com/"');
  });
});
