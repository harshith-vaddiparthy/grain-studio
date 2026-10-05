import { describe, expect, it } from "vitest";
import { canvasToBlob, exportDimensions } from "./image";
import type { ImageSource } from "../types";

const source = (width: number, height: number): ImageSource => ({ element: {} as HTMLImageElement, width, height, name: "fixture", isSample: false });

describe("safe image exports", () => {
  it("bounds large square exports to sixteen megapixels as well as the longest edge", () => {
    const size = exportDimensions(source(12000, 12000), "original");
    expect(size.width * size.height).toBeLessThanOrEqual(16777216);
    expect(size.width).toBe(size.height);
  });

  it("keeps ordinary original exports at their actual dimensions", () => {
    expect(exportDimensions(source(900, 600), "original")).toMatchObject({ width: 900, height: 600 });
  });

  it("rejects a browser encoder silently returning the wrong file format", async () => {
    const canvas = { toBlob: (cb: (blob: Blob) => void) => cb(new Blob(["test"], { type: "image/png" })) } as HTMLCanvasElement;
    await expect(canvasToBlob(canvas, "webp", 92)).rejects.toThrow(/format|WebP|encode/i);
  });
});
