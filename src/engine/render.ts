import { PALETTES } from "../data/filters";
import type { PaletteId, TextureId, TextureSettings } from "../types";
import { applyContrast, clamp, hash2d, luminance, mix, quantize, smoothNoise, type RGB } from "./math";

const BAYER_8 = [
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
] as const;

const PIXEL_TEXTURES = new Set<TextureId>([
  "riso-print",
  "bayer-grain",
  "cobalt-dust",
  "denim-dust",
  "harbor-dust",
  "meadow-dust",
  "paper-fiber",
  "watercolor",
  "sumi-wash",
  "blueprint",
]);

const DUST_PALETTES: Partial<Record<TextureId, { ink: RGB; paper: RGB; bias: number }>> = {
  "cobalt-dust": { ink: [48, 64, 225], paper: [246, 247, 244], bias: 3 },
  "denim-dust": { ink: [67, 113, 151], paper: [245, 246, 242], bias: 7 },
  "harbor-dust": { ink: [9, 87, 107], paper: [239, 245, 238], bias: 1 },
  "meadow-dust": { ink: [35, 127, 53], paper: [244, 247, 232], bias: 5 },
};

const rgb = (data: ArrayLike<number>, index: number): [number, number, number] => [
  data[index] ?? 0,
  data[index + 1] ?? 0,
  data[index + 2] ?? 0,
];

const contrastRgb = (color: RGB, contrast: number): [number, number, number] => [
  applyContrast(color[0], contrast),
  applyContrast(color[1], contrast),
  applyContrast(color[2], contrast),
];

const write = (output: Uint8ClampedArray, index: number, color: RGB, alpha = 255) => {
  output[index] = color[0];
  output[index + 1] = color[1];
  output[index + 2] = color[2];
  output[index + 3] = alpha;
};

const readAt = (data: Uint8ClampedArray, width: number, height: number, x: number, y: number) => {
  const safeX = Math.max(0, Math.min(width - 1, Math.round(x)));
  const safeY = Math.max(0, Math.min(height - 1, Math.round(y)));
  return rgb(data, (safeY * width + safeX) * 4);
};

function processDust(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  id: TextureId,
  settings: TextureSettings,
) {
  const output = new Uint8ClampedArray(source.length);
  const palette = DUST_PALETTES[id] ?? DUST_PALETTES["cobalt-dust"]!;
  const cell = Math.max(1, Math.round(1 + ((100 - settings.detail) / 100) * 3.5));
  const cellsX = Math.ceil(width / cell);
  const cellsY = Math.ceil(height / cell);
  const errors = new Float32Array(cellsX * cellsY);

  for (let cy = 0; cy < cellsY; cy += 1) {
    const leftToRight = cy % 2 === 0;
    for (let step = 0; step < cellsX; step += 1) {
      const cx = leftToRight ? step : cellsX - step - 1;
      const px = Math.min(width - 1, cx * cell + Math.floor(cell / 2));
      const py = Math.min(height - 1, cy * cell + Math.floor(cell / 2));
      const sourceColor = contrastRgb(readAt(source, width, height, px, py), settings.contrast);
      const location = cy * cellsX + cx;
      const noisyLuma = luminance(sourceColor) + errors[location] + (hash2d(cx, cy, settings.seed) - 0.5) * 12;
      const selected = noisyLuma < 128 + palette.bias ? palette.ink : palette.paper;
      const error = noisyLuma - (selected === palette.ink ? 0 : 255);
      const direction = leftToRight ? 1 : -1;
      const spread = (dx: number, dy: number, amount: number) => {
        const nx = cx + dx * direction;
        const ny = cy + dy;
        if (nx >= 0 && nx < cellsX && ny >= 0 && ny < cellsY) errors[ny * cellsX + nx] += error * amount;
      };
      spread(1, 0, 7 / 16);
      spread(-1, 1, 3 / 16);
      spread(0, 1, 5 / 16);
      spread(1, 1, 1 / 16);

      for (let y = cy * cell; y < Math.min(height, (cy + 1) * cell); y += 1) {
        for (let x = cx * cell; x < Math.min(width, (cx + 1) * cell); x += 1) {
          write(output, (y * width + x) * 4, selected, source[(y * width + x) * 4 + 3] ?? 255);
        }
      }
    }
  }
  return output;
}

function processRiso(source: Uint8ClampedArray, width: number, height: number, settings: TextureSettings) {
  const output = new Uint8ClampedArray(source.length);
  const paper: RGB = [242, 231, 201];
  const inks: RGB[] = [[7, 116, 137], [218, 78, 48], [230, 177, 33], [27, 51, 45]];
  const scale = Math.max(2, Math.round(3 + ((100 - settings.detail) / 100) * 7));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const sourceColor = contrastRgb(rgb(source, index), settings.contrast);
      const normalized = sourceColor.map((channel) => channel / 255);
      const black = 1 - Math.max(...normalized);
      const denominator = Math.max(0.001, 1 - black);
      const coverage = [
        (1 - normalized[0] - black) / denominator,
        (1 - normalized[1] - black) / denominator,
        (1 - normalized[2] - black) / denominator,
        black,
      ];
      let result: [number, number, number] = [...paper];
      const angles = [0.31, -0.25, 0, 0.74];
      for (let layer = 0; layer < coverage.length; layer += 1) {
        const cos = Math.cos(angles[layer]);
        const sin = Math.sin(angles[layer]);
        const rx = x * cos - y * sin + layer * 1.9;
        const ry = x * sin + y * cos + layer * 1.2;
        const cellX = ((rx % scale) + scale) % scale - scale / 2;
        const cellY = ((ry % scale) + scale) % scale - scale / 2;
        const radius = Math.sqrt(clamp(coverage[layer], 0, 1) / Math.PI) * scale;
        if (cellX * cellX + cellY * cellY <= radius * radius) {
          const ink = inks[layer];
          result = [
            (result[0] * ink[0]) / 255,
            (result[1] * ink[1]) / 255,
            (result[2] * ink[2]) / 255,
          ];
        }
      }
      const fleck = (hash2d(x / scale + 13, y / scale - 7, settings.seed) - 0.5) * 8;
      write(output, index, [clamp(result[0] + fleck), clamp(result[1] + fleck), clamp(result[2] + fleck)], source[index + 3]);
    }
  }
  return output;
}

function processBayer(source: Uint8ClampedArray, width: number, height: number, settings: TextureSettings) {
  const output = new Uint8ClampedArray(source.length);
  const block = Math.max(1, Math.round(1 + ((100 - settings.detail) / 100) * 4));
  const levels = settings.detail > 72 ? 6 : settings.detail > 38 ? 4 : 3;
  for (let y = 0; y < height; y += block) {
    for (let x = 0; x < width; x += block) {
      const sourceIndex = (y * width + x) * 4;
      const threshold = ((BAYER_8[((Math.floor(y / block) % 8) * 8 + (Math.floor(x / block) % 8))] ?? 0) + 0.5) / 64;
      const transformed = contrastRgb(rgb(source, sourceIndex), settings.contrast).map((channel) => {
        const scaled = (channel / 255) * (levels - 1);
        const lower = Math.floor(scaled);
        return ((lower + Number(scaled - lower > threshold)) / (levels - 1)) * 255;
      }) as [number, number, number];
      for (let by = y; by < Math.min(height, y + block); by += 1) {
        for (let bx = x; bx < Math.min(width, x + block); bx += 1) {
          write(output, (by * width + bx) * 4, transformed, source[(by * width + bx) * 4 + 3]);
        }
      }
    }
  }
  return output;
}

function processPaper(source: Uint8ClampedArray, width: number, height: number, settings: TextureSettings) {
  const output = new Uint8ClampedArray(source.length);
  const paper: RGB = PALETTES[settings.palette === "source" ? "ember" : settings.palette].paper;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const original = contrastRgb(rgb(source, index), settings.contrast);
      const broad = (smoothNoise(x, y, 34, settings.seed) - 0.5) * 14;
      const fiber = (smoothNoise(x * 0.2, y, 12, settings.seed + 9) - 0.5) * 8;
      const fleck = hash2d(x * 0.39, y * 0.43, settings.seed + 4) > 0.991 ? -22 : 0;
      write(output, index, [
        clamp(paper[0] + (original[0] - paper[0]) * 0.7 + broad + fiber + fleck),
        clamp(paper[1] + (original[1] - paper[1]) * 0.7 + broad + fiber + fleck),
        clamp(paper[2] + (original[2] - paper[2]) * 0.7 + broad + fiber + fleck),
      ], source[index + 3]);
    }
  }
  return output;
}

function processWatercolor(source: Uint8ClampedArray, width: number, height: number, settings: TextureSettings) {
  const output = new Uint8ClampedArray(source.length);
  const radius = Math.max(1, Math.round(1 + ((100 - settings.detail) / 100) * 5));
  const offsets = [[0, 0], [-radius, 0], [radius, 0], [0, -radius], [0, radius]] as const;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const average: [number, number, number] = [0, 0, 0];
      for (const [dx, dy] of offsets) {
        const sampled = readAt(source, width, height, x + dx, y + dy);
        average[0] += sampled[0] / offsets.length;
        average[1] += sampled[1] / offsets.length;
        average[2] += sampled[2] / offsets.length;
      }
      const wash = contrastRgb(average, settings.contrast).map((channel) => quantize(channel, 18)) as [number, number, number];
      const bloom = (smoothNoise(x, y, 26, settings.seed) - 0.5) * 18;
      const edge = Math.abs(luminance(readAt(source, width, height, x - radius, y)) - luminance(readAt(source, width, height, x + radius, y))) / 255;
      write(output, index, [
        clamp(wash[0] * (1 - edge * 0.18) + bloom + 7),
        clamp(wash[1] * (1 - edge * 0.18) + bloom + 5),
        clamp(wash[2] * (1 - edge * 0.18) + bloom),
      ], source[index + 3] ?? 255);
    }
  }
  return output;
}

function processSumi(source: Uint8ClampedArray, width: number, height: number, settings: TextureSettings) {
  const output = new Uint8ClampedArray(source.length);
  const ink: RGB = PALETTES.ink.ink;
  const paper: RGB = PALETTES.ink.paper;
  const radius = Math.max(1, Math.round(settings.scale / 7));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const tone = applyContrast(luminance(rgb(source, index)), settings.contrast + 4) / 255;
      const edge = (
        Math.abs(luminance(readAt(source, width, height, x - radius, y)) - luminance(readAt(source, width, height, x + radius, y))) +
        Math.abs(luminance(readAt(source, width, height, x, y - radius)) - luminance(readAt(source, width, height, x, y + radius)))
      ) / 510;
      const wash = clamp(Math.round((tone + (smoothNoise(x, y, 30, settings.seed) - 0.5) * 0.13 - edge * 0.42) * 6) / 6, 0, 1);
      const fleck = (hash2d(x * 0.31, y * 0.59, settings.seed) - 0.5) * 6;
      write(output, index, [
        clamp(mix(ink[0], paper[0], wash) + fleck),
        clamp(mix(ink[1], paper[1], wash) + fleck),
        clamp(mix(ink[2], paper[2], wash) + fleck),
      ], source[index + 3]);
    }
  }
  return output;
}

function processBlueprint(source: Uint8ClampedArray, width: number, height: number, settings: TextureSettings) {
  const output = new Uint8ClampedArray(source.length);
  const low: RGB = [4, 27, 54];
  const mid: RGB = [12, 91, 132];
  const high: RGB = [229, 236, 214];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const tone = applyContrast(luminance(rgb(source, index)), settings.contrast + 5) / 255;
      const mapped = tone < 0.5
        ? ([mix(low[0], mid[0], tone * 2), mix(low[1], mid[1], tone * 2), mix(low[2], mid[2], tone * 2)] as RGB)
        : ([mix(mid[0], high[0], (tone - 0.5) * 2), mix(mid[1], high[1], (tone - 0.5) * 2), mix(mid[2], high[2], (tone - 0.5) * 2)] as RGB);
      const grain = (hash2d(x * 0.47, y * 0.53, settings.seed) - 0.5) * 10;
      write(output, index, [clamp(mapped[0] + grain), clamp(mapped[1] + grain), clamp(mapped[2] + grain)], source[index + 3]);
    }
  }
  return output;
}

export function applyPixelTexture(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  id: TextureId,
  settings: TextureSettings,
) {
  if (id === "riso-print") return processRiso(source, width, height, settings);
  if (id === "bayer-grain") return processBayer(source, width, height, settings);
  if (id.endsWith("-dust")) return processDust(source, width, height, id, settings);
  if (id === "paper-fiber") return processPaper(source, width, height, settings);
  if (id === "watercolor") return processWatercolor(source, width, height, settings);
  if (id === "sumi-wash") return processSumi(source, width, height, settings);
  if (id === "blueprint") return processBlueprint(source, width, height, settings);
  return new Uint8ClampedArray(source);
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function sampleCell(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, cellWidth: number, cellHeight = cellWidth) {
  const stride = Math.max(1, Math.floor(Math.min(cellWidth, cellHeight) / 3));
  const endX = Math.min(width, Math.ceil(x + cellWidth));
  const endY = Math.min(height, Math.ceil(y + cellHeight));
  const result = [0, 0, 0];
  let count = 0;
  for (let sy = Math.max(0, Math.floor(y)); sy < endY; sy += stride) {
    for (let sx = Math.max(0, Math.floor(x)); sx < endX; sx += stride) {
      const index = (sy * width + sx) * 4;
      result[0] += data[index] ?? 0;
      result[1] += data[index + 1] ?? 0;
      result[2] += data[index + 2] ?? 0;
      count += 1;
    }
  }
  const divisor = Math.max(1, count);
  return [result[0] / divisor, result[1] / divisor, result[2] / divisor] as [number, number, number];
}

function colorForTone(sample: RGB, paletteId: PaletteId, tone: number) {
  if (paletteId === "source") return sample;
  const palette = PALETTES[paletteId];
  const amount = clamp(tone / 255, 0, 1);
  return [
    mix(palette.ink[0], palette.paper[0], amount),
    mix(palette.ink[1], palette.paper[1], amount),
    mix(palette.ink[2], palette.paper[2], amount),
  ] as RGB;
}

const cssRgb = (color: RGB, alpha = 1) => `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${alpha})`;

function drawPatternTexture(
  effect: HTMLCanvasElement,
  sourceData: ImageData,
  id: TextureId,
  settings: TextureSettings,
) {
  const context = effect.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
  const { width, height, data } = sourceData;
  const palette = PALETTES[settings.palette];
  const resolutionScale = Math.max(width, height) / 1400;
  const base = 4 + ((100 - settings.detail) / 100) * 13;
  const cell = Math.max(2, base * (settings.scale / 12) * resolutionScale);
  const row = id === "glyph-weave" || id === "type-blocks" || id === "signal-mix" ? cell * 1.55 : cell;
  const darkBackground = id === "chroma-pop";
  context.fillStyle = darkBackground ? "#111714" : cssRgb(paletteIdPaper(settings.palette));
  context.fillRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineCap = "round";
  context.lineJoin = "round";

  const glyphs = id === "type-blocks" ? "█▓▒░ " : id === "signal-mix" ? "@▓#*+·:- " : "@%#*+=-:. ";
  const braille = ["⠀", "⠁", "⠃", "⠇", "⠏", "⠟", "⠿", "⣿"];

  for (let y = 0, rowIndex = 0; y < height + row; y += row, rowIndex += 1) {
    for (let x = 0, columnIndex = 0; x < width + cell; x += cell, columnIndex += 1) {
      const sample = contrastRgb(sampleCell(data, width, height, x, y, cell, row), settings.contrast);
      const tone = luminance(sample);
      const darkness = 1 - tone / 255;
      const centerX = x + cell / 2;
      const centerY = y + row / 2;
      const markColor = colorForTone(sample, settings.palette, tone);
      context.fillStyle = cssRgb(markColor, 0.95);
      context.strokeStyle = context.fillStyle;

      if (id === "glyph-weave" || id === "type-blocks" || id === "signal-mix") {
        const jitter = id === "signal-mix" ? Math.floor(hash2d(columnIndex, rowIndex, settings.seed) * 3) - 1 : 0;
        const glyphIndex = Math.max(0, Math.min(glyphs.length - 1, Math.floor((tone / 256) * glyphs.length) + jitter));
        context.font = `${id === "type-blocks" ? 700 : 620} ${Math.ceil(row * 0.88)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        if (id === "signal-mix" && darkness > 0.42) {
          context.fillStyle = cssRgb(PALETTES.ember.ink, 0.4);
          context.fillText(glyphs[glyphIndex] ?? " ", centerX + cell * 0.16, centerY);
          context.fillStyle = cssRgb(markColor, 0.94);
        }
        context.fillText(glyphs[glyphIndex] ?? " ", centerX, centerY);
        continue;
      }

      if (id === "dot-cells") {
        const index = Math.max(0, Math.min(braille.length - 1, Math.floor(darkness * braille.length)));
        context.font = `650 ${Math.ceil(row * 1.2)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.fillText(braille[index] ?? "⠀", centerX, centerY);
        continue;
      }

      if (id === "stipple") {
        const radius = cell * (0.06 + darkness * 0.43);
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.fill();
        continue;
      }

      if (id === "cross-dot") {
        if (darkness < 0.08) continue;
        if (darkness < 0.32) {
          context.beginPath();
          context.arc(centerX, centerY, cell * (0.06 + darkness * 0.1), 0, Math.PI * 2);
          context.fill();
        } else {
          const reach = cell * (0.16 + darkness * 0.3);
          context.lineWidth = Math.max(1, cell * (0.08 + darkness * 0.08));
          context.beginPath();
          context.moveTo(centerX - reach, centerY - reach);
          context.lineTo(centerX + reach, centerY + reach);
          context.moveTo(centerX + reach, centerY - reach);
          context.lineTo(centerX - reach, centerY + reach);
          if (darkness > 0.76) {
            context.moveTo(centerX - reach, centerY);
            context.lineTo(centerX + reach, centerY);
          }
          context.stroke();
        }
        continue;
      }

      if (id === "crossmarks") {
        const reach = cell * (0.12 + darkness * 0.38);
        context.lineWidth = Math.max(1, cell * 0.12);
        context.beginPath();
        context.moveTo(centerX - reach, centerY);
        context.lineTo(centerX + reach, centerY);
        context.moveTo(centerX, centerY - reach);
        context.lineTo(centerX, centerY + reach);
        context.stroke();
        continue;
      }

      if (id === "facets") {
        const reach = cell * (0.12 + darkness * 0.42);
        context.beginPath();
        context.moveTo(centerX, centerY - reach);
        context.lineTo(centerX + reach, centerY);
        context.lineTo(centerX, centerY + reach);
        context.lineTo(centerX - reach, centerY);
        context.closePath();
        context.fill();
        continue;
      }

      if (id === "linepress" || id === "slant") {
        const reach = cell * (0.16 + darkness * 0.4);
        context.lineWidth = Math.max(1, cell * 0.12);
        context.beginPath();
        if (id === "linepress") {
          context.moveTo(centerX - reach, centerY);
          context.lineTo(centerX + reach, centerY);
        } else {
          context.moveTo(centerX - reach, centerY + reach);
          context.lineTo(centerX + reach, centerY - reach);
        }
        context.stroke();
        continue;
      }

      if (id === "pixel-crush") {
        const levels = settings.detail > 60 ? 6 : 4;
        const pixelColor = sample.map((channel) => quantize(channel, levels)) as [number, number, number];
        context.fillStyle = cssRgb(pixelColor);
        context.fillRect(x, y, Math.ceil(cell) + 0.5, Math.ceil(cell) + 0.5);
        continue;
      }

      if (id === "tessera") {
        context.fillStyle = cssRgb(sample, 0.95);
        const gap = Math.max(1, cell * 0.11);
        context.fillRect(x + gap, y + gap, Math.max(1, cell - gap * 2), Math.max(1, row - gap * 2));
        continue;
      }

      if (id === "studwork") {
        context.fillStyle = cssRgb(sample, 0.96);
        context.fillRect(x, y, Math.ceil(cell), Math.ceil(row));
        const radius = cell * 0.24;
        const highlight = sample.map((channel) => clamp(channel * 1.28)) as [number, number, number];
        context.fillStyle = cssRgb(highlight, 0.76);
        context.beginPath();
        context.arc(centerX - cell * 0.07, centerY - row * 0.07, radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "rgba(0, 0, 0, .2)";
        context.beginPath();
        context.arc(centerX + cell * 0.06, centerY + row * 0.06, radius * 0.86, 0, Math.PI * 2);
        context.fill();
        continue;
      }

      if (id === "isoform") {
        const half = cell / 2;
        const vertical = cell * 0.28;
        const light = sample.map((channel) => clamp(channel * 1.25)) as [number, number, number];
        const shade = sample.map((channel) => clamp(channel * 0.6)) as [number, number, number];
        context.fillStyle = cssRgb(light);
        context.beginPath();
        context.moveTo(centerX, centerY - vertical);
        context.lineTo(centerX + half, centerY);
        context.lineTo(centerX, centerY + vertical);
        context.lineTo(centerX - half, centerY);
        context.closePath();
        context.fill();
        context.fillStyle = cssRgb(sample);
        context.beginPath();
        context.moveTo(centerX - half, centerY);
        context.lineTo(centerX, centerY + vertical);
        context.lineTo(centerX, centerY + vertical * 2.4);
        context.lineTo(centerX - half, centerY + vertical * 1.4);
        context.closePath();
        context.fill();
        context.fillStyle = cssRgb(shade);
        context.beginPath();
        context.moveTo(centerX + half, centerY);
        context.lineTo(centerX, centerY + vertical);
        context.lineTo(centerX, centerY + vertical * 2.4);
        context.lineTo(centerX + half, centerY + vertical * 1.4);
        context.closePath();
        context.fill();
        continue;
      }

      if (id === "chroma-pop") {
        const hueColor: RGB = [
          clamp(sample[0] * 1.28 + 20),
          clamp(sample[1] * 1.2 + 14),
          clamp(sample[2] * 1.32 + 22),
        ];
        const radius = cell * (0.19 + darkness * 0.2);
        context.shadowColor = cssRgb(hueColor, 0.5);
        context.shadowBlur = Math.max(1, cell * 0.22);
        context.fillStyle = cssRgb(hueColor);
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }
    }
  }
}

function paletteIdPaper(paletteId: PaletteId): RGB {
  if (paletteId === "source") return [236, 233, 222];
  return PALETTES[paletteId].paper;
}

export function renderTexture(
  source: CanvasImageSource,
  target: HTMLCanvasElement,
  id: TextureId,
  settings: TextureSettings,
  width: number,
  height: number,
) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  target.width = safeWidth;
  target.height = safeHeight;
  const output = target.getContext("2d", { alpha: false });
  if (!output) throw new Error("Canvas rendering is unavailable in this browser.");

  const base = createCanvas(safeWidth, safeHeight);
  const baseContext = base.getContext("2d", { alpha: false });
  if (!baseContext) throw new Error("Canvas rendering is unavailable in this browser.");
  baseContext.imageSmoothingEnabled = true;
  baseContext.imageSmoothingQuality = "high";
  baseContext.drawImage(source, 0, 0, safeWidth, safeHeight);
  const sourceData = baseContext.getImageData(0, 0, safeWidth, safeHeight);

  const effect = createCanvas(safeWidth, safeHeight);
  if (PIXEL_TEXTURES.has(id)) {
    const effectContext = effect.getContext("2d", { alpha: false });
    if (!effectContext) throw new Error("Canvas rendering is unavailable in this browser.");
    const transformed = applyPixelTexture(sourceData.data, safeWidth, safeHeight, id, settings);
    effectContext.putImageData(new ImageData(transformed, safeWidth, safeHeight), 0, 0);
  } else {
    drawPatternTexture(effect, sourceData, id, settings);
  }

  output.clearRect(0, 0, safeWidth, safeHeight);
  output.drawImage(base, 0, 0);
  output.globalAlpha = clamp(settings.intensity, 0, 100) / 100;
  output.drawImage(effect, 0, 0);
  output.globalAlpha = 1;
}

export function drawOriginal(source: CanvasImageSource, target: HTMLCanvasElement, width: number, height: number) {
  target.width = Math.max(1, Math.round(width));
  target.height = Math.max(1, Math.round(height));
  const context = target.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, target.width, target.height);
}
