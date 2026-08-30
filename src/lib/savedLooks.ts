/* Saved looks: the product's only reason to come back.

   A saved look is just a recipe string plus the label to show for it, so this
   reuses the share format rather than inventing a second one. Storage is local
   and bounded; no account, no server, and no image data is involved.

   The parse and mutate helpers are pure and exported so the storage contract can
   be tested without a browser. Anything unrecognised in storage is discarded
   rather than trusted, because a corrupt or hand-edited entry must never be able
   to apply an arbitrary state to the editor. */

import { TEXTURE_BY_ID } from "../data/filters";
import { decodeRecipe, encodeRecipe } from "./recipe";
import type { TextureId, TextureSettings } from "../types";

export const SAVED_LOOKS_KEY = "grain-studio-saved-looks";
export const SAVED_LOOKS_LIMIT = 24;

export type SavedLook = {
  recipe: string;
  label: string;
  savedAt: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/* Accepts anything and returns only entries that decode to a real look. */
export function parseSavedLooks(raw: string | null | undefined): SavedLook[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const seen = new Set<string>();
  const looks: SavedLook[] = [];
  for (const entry of parsed) {
    if (!isRecord(entry)) continue;
    const recipe = typeof entry.recipe === "string" ? entry.recipe : "";
    if (!decodeRecipe(recipe)) continue;
    if (seen.has(recipe)) continue;
    seen.add(recipe);
    looks.push({
      recipe,
      label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim().slice(0, 48) : "Saved look",
      savedAt: typeof entry.savedAt === "number" && Number.isFinite(entry.savedAt) ? entry.savedAt : 0,
    });
    if (looks.length >= SAVED_LOOKS_LIMIT) break;
  }
  return looks;
}

/* Newest first, deduplicated by recipe, bounded to the limit. Re-saving an
   existing look moves it to the front instead of creating a duplicate. */
export function addSavedLook(existing: readonly SavedLook[], look: SavedLook): SavedLook[] {
  const withoutDuplicate = existing.filter((entry) => entry.recipe !== look.recipe);
  return [look, ...withoutDuplicate].slice(0, SAVED_LOOKS_LIMIT);
}

export function removeSavedLook(existing: readonly SavedLook[], recipe: string): SavedLook[] {
  return existing.filter((entry) => entry.recipe !== recipe);
}

export function describeLook(textureId: TextureId, settings: TextureSettings): SavedLook {
  const definition = TEXTURE_BY_ID[textureId];
  const adjusted = encodeRecipe(textureId, settings) !== encodeRecipe(textureId, definition.defaults);
  return {
    recipe: encodeRecipe(textureId, settings),
    // The job name is what a returning user will recognise, not the brand label.
    label: adjusted ? `${definition.job} (tuned)` : definition.job,
    savedAt: Date.now(),
  };
}

const store = (): Storage | null => {
  try {
    const probe = "__gs_looks_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
};

export function loadSavedLooks(): SavedLook[] {
  return parseSavedLooks(store()?.getItem(SAVED_LOOKS_KEY));
}

export function persistSavedLooks(looks: readonly SavedLook[]): void {
  try {
    store()?.setItem(SAVED_LOOKS_KEY, JSON.stringify(looks.slice(0, SAVED_LOOKS_LIMIT)));
  } catch {
    // A full or blocked storage must not break the editor.
  }
}
