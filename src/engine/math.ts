export type RGB = readonly [number, number, number];

export const clamp = (value: number, min = 0, max = 255) => Math.min(max, Math.max(min, value));

export const luminance = (color: ArrayLike<number>) =>
  0.2126 * (color[0] ?? 0) + 0.7152 * (color[1] ?? 0) + 0.0722 * (color[2] ?? 0);

export const applyContrast = (value: number, amount: number) => {
  const normalized = ((amount - 50) / 50) * 0.72;
  const factor = (1 + normalized) / Math.max(0.05, 1 - normalized);
  return clamp((value / 255 - 0.5) * factor * 255 + 127.5);
};

export const hash2d = (x: number, y: number, seed = 0) => {
  const raw = Math.sin((x + seed * 0.173) * 12.9898 + (y - seed * 0.319) * 78.233) * 43758.5453123;
  return raw - Math.floor(raw);
};

export const smoothNoise = (x: number, y: number, size: number, seed = 0) => {
  const safeSize = Math.max(0.0001, size);
  const gx = x / safeSize;
  const gy = y / safeSize;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const top = hash2d(ix, iy, seed) * (1 - ux) + hash2d(ix + 1, iy, seed) * ux;
  const bottom = hash2d(ix, iy + 1, seed) * (1 - ux) + hash2d(ix + 1, iy + 1, seed) * ux;
  return top * (1 - uy) + bottom * uy;
};

export const mix = (from: number, to: number, amount: number) => from * (1 - amount) + to * amount;

export const mixRgb = (from: RGB, to: RGB, amount: number): [number, number, number] => [
  clamp(mix(from[0], to[0], amount)),
  clamp(mix(from[1], to[1], amount)),
  clamp(mix(from[2], to[2], amount)),
];

export const quantize = (value: number, levels: number) => {
  const safeLevels = Math.max(2, Math.round(levels));
  return Math.round((clamp(value) / 255) * (safeLevels - 1)) * (255 / (safeLevels - 1));
};

export const formatBytes = (bytes?: number) => {
  if (!bytes) return "Generated sample";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

export const fitWithin = (width: number, height: number, maxSide: number) => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = Math.min(1, maxSide / Math.max(safeWidth, safeHeight));
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
    scale,
  };
};
