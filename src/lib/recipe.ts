/* Shareable recipe links.

   A recipe encodes only the selected effect and its six numeric/enumerated
   settings. It never contains, references, or derives from the user's image, so
   sharing a recipe cannot leak picture data even in principle. That property is
   what allows Grain Studio to have a sharing loop while keeping every image
   local to the browser.

   Wire format (dot separated, URL safe, human inspectable):

     1.riso-print.92.60.58.11.ember.17
     ^ ^          ^  ^  ^  ^  ^     ^
     | texture    |  |  |  |  |     seed
     version      |  |  |  scale palette
                  |  detail
                  intensity, then contrast

   Decoding is strict and total: an unknown version, unknown effect, unknown
   palette, non-finite number, or wrong field count yields null rather than a
   partially applied state. */

import { PALETTES, TEXTURE_BY_ID } from "../data/filters";
import type { PaletteId, TextureId, TextureSettings } from "../types";

export const RECIPE_VERSION = "1";
export const RECIPE_QUERY_KEY = "r";

/* Character set the encoder is allowed to emit. Asserted in tests so the wire
   format can never quietly widen into something that could carry free text. */
export const RECIPE_PATTERN = /^[0-9a-z.-]+$/;

export type Recipe = {
  textureId: TextureId;
  settings: TextureSettings;
};

const BOUNDS = {
  intensity: [0, 100],
  detail: [0, 100],
  contrast: [0, 100],
  scale: [4, 32],
  seed: [0, 99_999],
} as const;

const clampInteger = (value: number, [min, max]: readonly [number, number]) =>
  Math.min(max, Math.max(min, Math.round(value)));

const isPaletteId = (value: string): value is PaletteId => Object.prototype.hasOwnProperty.call(PALETTES, value);

const isTextureId = (value: string): value is TextureId =>
  Object.prototype.hasOwnProperty.call(TEXTURE_BY_ID, value);

const parseNumber = (raw: string | undefined) => {
  if (!raw || !/^-?\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export function encodeRecipe(textureId: TextureId, settings: TextureSettings): string {
  return [
    RECIPE_VERSION,
    textureId,
    clampInteger(settings.intensity, BOUNDS.intensity),
    clampInteger(settings.detail, BOUNDS.detail),
    clampInteger(settings.contrast, BOUNDS.contrast),
    clampInteger(settings.scale, BOUNDS.scale),
    settings.palette,
    clampInteger(settings.seed, BOUNDS.seed),
  ].join(".");
}

export function decodeRecipe(raw: string | null | undefined): Recipe | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!RECIPE_PATTERN.test(trimmed)) return null;

  const parts = trimmed.split(".");
  if (parts.length !== 8) return null;

  const [version, textureId, intensity, detail, contrast, scale, palette, seed] = parts;
  if (version !== RECIPE_VERSION) return null;
  if (!textureId || !isTextureId(textureId)) return null;
  if (!palette || !isPaletteId(palette)) return null;

  const numbers = {
    intensity: parseNumber(intensity),
    detail: parseNumber(detail),
    contrast: parseNumber(contrast),
    scale: parseNumber(scale),
    seed: parseNumber(seed),
  };
  if (Object.values(numbers).some((value) => value === null)) return null;

  return {
    textureId,
    settings: {
      intensity: clampInteger(numbers.intensity as number, BOUNDS.intensity),
      detail: clampInteger(numbers.detail as number, BOUNDS.detail),
      contrast: clampInteger(numbers.contrast as number, BOUNDS.contrast),
      scale: clampInteger(numbers.scale as number, BOUNDS.scale),
      palette,
      seed: clampInteger(numbers.seed as number, BOUNDS.seed),
    },
  };
}

/* Absolute link a creator can paste anywhere. Only the recipe query parameter is
   carried across; any other parameter on the current URL is intentionally
   dropped so campaign or session values are never forwarded to a recipient. */
export function recipeLink(origin: string, textureId: TextureId, settings: TextureSettings): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/?${RECIPE_QUERY_KEY}=${encodeRecipe(textureId, settings)}`;
}

export function readRecipeFromSearch(search: string): Recipe | null {
  try {
    return decodeRecipe(new URLSearchParams(search).get(RECIPE_QUERY_KEY));
  } catch {
    return null;
  }
}
