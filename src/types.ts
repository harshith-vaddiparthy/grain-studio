export type TextureCategory = "Print" | "Grain" | "Paint" | "Pattern" | "Pixel";

export type PaletteId = "source" | "ink" | "cobalt" | "ember" | "meadow";

export type TextureId =
  | "glyph-weave"
  | "riso-print"
  | "bayer-grain"
  | "cobalt-dust"
  | "denim-dust"
  | "harbor-dust"
  | "meadow-dust"
  | "cross-dot"
  | "type-blocks"
  | "stipple"
  | "paper-fiber"
  | "watercolor"
  | "sumi-wash"
  | "blueprint"
  | "signal-mix"
  | "pixel-crush"
  | "tessera"
  | "studwork"
  | "crossmarks"
  | "facets"
  | "linepress"
  | "slant"
  | "dot-cells"
  | "isoform"
  | "chroma-pop";

export type TextureSettings = {
  intensity: number;
  detail: number;
  contrast: number;
  scale: number;
  palette: PaletteId;
  seed: number;
};

export type TextureDefinition = {
  id: TextureId;
  label: string;
  shortLabel: string;
  category: TextureCategory;
  /* What this effect is called in ordinary language. The catalog labels are
     deliberate brand names, which read well but tell a newcomer nothing; `job`
     is the term a designer would actually search for. */
  job: string;
  description: string;
  defaults: TextureSettings;
  swatch: string;
};

/* "Start here" is a curated subset shown first, so a new visitor chooses between
   a handful of recognisable jobs instead of twenty-five invented names. */
export type TextureFilter = "Start here" | "All" | TextureCategory;

export type ImageSource = {
  element: HTMLImageElement;
  name: string;
  width: number;
  height: number;
  bytes?: number;
  objectUrl?: string;
  isSample: boolean;
};

export type RenderStatus = "idle" | "rendering" | "ready" | "error";

export type ExportFormat = "png" | "jpeg" | "webp";
export type ExportSize = "original" | "4096" | "2048" | "1024";
