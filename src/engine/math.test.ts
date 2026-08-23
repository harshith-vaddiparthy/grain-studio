import { describe, expect, it } from "vitest";
import { applyContrast, fitWithin, formatBytes, hash2d, luminance, quantize } from "./math";

describe("texture math", () => {
  it("keeps neutral contrast close to the input", () => {
    expect(applyContrast(128, 50)).toBeCloseTo(128, 4);
    expect(applyContrast(0, 50)).toBeCloseTo(0, 4);
    expect(applyContrast(255, 50)).toBeCloseTo(255, 4);
  });

  it("creates deterministic bounded noise", () => {
    const first = hash2d(12, 8, 42);
    expect(first).toBe(hash2d(12, 8, 42));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
    expect(first).not.toBe(hash2d(12, 8, 43));
  });

  it("quantizes to the requested number of levels", () => {
    expect(quantize(0, 4)).toBe(0);
    expect(quantize(255, 4)).toBe(255);
    expect([0, 85, 170, 255]).toContain(quantize(120, 4));
  });

  it("fits dimensions without upscaling", () => {
    expect(fitWithin(4000, 2000, 1000)).toEqual({ width: 1000, height: 500, scale: 0.25 });
    expect(fitWithin(500, 300, 1000)).toEqual({ width: 500, height: 300, scale: 1 });
  });

  it("formats image metadata", () => {
    expect(formatBytes()).toBe("Generated sample");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("uses perceptual luminance", () => {
    expect(luminance([255, 255, 255])).toBeCloseTo(255, 4);
    expect(luminance([0, 0, 0])).toBe(0);
    expect(luminance([0, 255, 0])).toBeGreaterThan(luminance([255, 0, 0]));
  });
});
