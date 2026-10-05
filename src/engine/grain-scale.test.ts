import { describe, expect, it } from "vitest";
import { applyPixelTexture } from "./render";
import type { TextureSettings } from "../types";

const settings: TextureSettings = { intensity: 100, detail: 60, contrast: 50, scale: 8, palette: "source", seed: 17 };
const image = (width: number, height: number) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i=0;i<pixels.length;i+=4) pixels.set([90,140,170,255],i);
  return pixels;
};

describe("film grain relative scale", () => {
  it("uses the same grain at corresponding pixel centres in a larger render", () => {
    const small = applyPixelTexture(image(48,32),48,32,"film-grain",settings);
    const large = applyPixelTexture(image(144,96),144,96,"film-grain",settings);
    for (let y=2;y<30;y+=3) for(let x=2;x<46;x+=3) {
      expect(large[((y*3+1)*144+x*3+1)*4]).toBe(small[(y*48+x)*4]);
    }
  });
});
