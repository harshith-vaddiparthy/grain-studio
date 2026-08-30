import { describe, expect, it } from "vitest";
import { TEXTURE_BY_ID } from "../data/filters";
import {
  SAVED_LOOKS_LIMIT,
  addSavedLook,
  describeLook,
  parseSavedLooks,
  removeSavedLook,
  type SavedLook,
} from "./savedLooks";

const look = (recipe: string, label = "Test look", savedAt = 1): SavedLook => ({ recipe, label, savedAt });
const RISO = "1.riso-print.92.60.58.11.ember.17";
const BLUE = "1.blueprint.100.70.62.10.cobalt.17";

describe("saved looks storage contract", () => {
  it("returns nothing for absent, empty, or non-JSON storage", () => {
    expect(parseSavedLooks(null)).toEqual([]);
    expect(parseSavedLooks("")).toEqual([]);
    expect(parseSavedLooks("not json")).toEqual([]);
    expect(parseSavedLooks('{"not":"an array"}')).toEqual([]);
  });

  it("discards any entry that does not decode to a real look", () => {
    const stored = JSON.stringify([
      { recipe: RISO, label: "Keep me", savedAt: 5 },
      { recipe: "1.not-a-texture.1.1.1.4.ink.1", label: "Unknown effect" },
      { recipe: "javascript:alert(1)", label: "Hostile" },
      { recipe: 42, label: "Wrong type" },
      "just a string",
      null,
    ]);
    const looks = parseSavedLooks(stored);
    expect(looks).toHaveLength(1);
    expect(looks[0].recipe).toBe(RISO);
  });

  it("deduplicates and bounds what it will read back", () => {
    const many = Array.from({ length: SAVED_LOOKS_LIMIT + 10 }, (_, i) => ({
      recipe: `1.riso-print.${i % 100}.60.58.11.ember.17`,
      label: `Look ${i}`,
      savedAt: i,
    }));
    expect(parseSavedLooks(JSON.stringify(many)).length).toBeLessThanOrEqual(SAVED_LOOKS_LIMIT);
    expect(parseSavedLooks(JSON.stringify([{ recipe: RISO }, { recipe: RISO }]))).toHaveLength(1);
  });

  it("repairs a missing or unusable label rather than dropping the look", () => {
    const looks = parseSavedLooks(JSON.stringify([{ recipe: RISO }, { recipe: BLUE, label: "   " }]));
    expect(looks.map((l) => l.label)).toEqual(["Saved look", "Saved look"]);
  });
});

describe("saved looks mutation", () => {
  it("puts the newest look first", () => {
    const result = addSavedLook([look(RISO)], look(BLUE, "Blueprint"));
    expect(result.map((l) => l.recipe)).toEqual([BLUE, RISO]);
  });

  it("moves a re-saved look to the front instead of duplicating it", () => {
    const result = addSavedLook([look(BLUE), look(RISO)], look(RISO, "Riso again", 9));
    expect(result).toHaveLength(2);
    expect(result[0].recipe).toBe(RISO);
    expect(result[0].label).toBe("Riso again");
  });

  it("never grows past the limit", () => {
    let looks: SavedLook[] = [];
    for (let i = 0; i < SAVED_LOOKS_LIMIT + 5; i += 1) {
      looks = addSavedLook(looks, look(`1.riso-print.${i}.60.58.11.ember.17`, `Look ${i}`));
    }
    expect(looks).toHaveLength(SAVED_LOOKS_LIMIT);
  });

  it("removes only the requested look", () => {
    const result = removeSavedLook([look(RISO), look(BLUE)], RISO);
    expect(result.map((l) => l.recipe)).toEqual([BLUE]);
  });
});

describe("look labels", () => {
  it("names a look by its ordinary-language job so it is recognisable later", () => {
    const definition = TEXTURE_BY_ID["blueprint"];
    const described = describeLook("blueprint", definition.defaults);
    expect(described.label).toBe(definition.job);
    expect(described.label).toBe("Cyanotype blueprint");
  });

  it("marks a tuned look so it is distinguishable from the preset", () => {
    const definition = TEXTURE_BY_ID["blueprint"];
    const described = describeLook("blueprint", { ...definition.defaults, intensity: 12 });
    expect(described.label).toBe("Cyanotype blueprint (tuned)");
  });

  it("produces a recipe that survives a round trip", () => {
    const definition = TEXTURE_BY_ID["stipple"];
    const described = describeLook("stipple", definition.defaults);
    expect(parseSavedLooks(JSON.stringify([described]))).toHaveLength(1);
  });
});
