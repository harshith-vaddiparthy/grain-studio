import type { PaletteId, TextureCategory, TextureDefinition, TextureId, TextureSettings } from "../types";

const defaults = (
  detail: number,
  intensity: number,
  contrast: number,
  scale: number,
  palette: PaletteId = "source",
): TextureSettings => ({ detail, intensity, contrast, scale, palette, seed: 17 });

export const TEXTURES: readonly TextureDefinition[] = [
  { id: "glyph-weave", label: "Glyph Weave", shortLabel: "Glyph", category: "Print", description: "Monospaced characters rebuild the image from sampled light.", defaults: defaults(68, 84, 56, 12, "ink"), swatch: "glyph" },
  { id: "riso-print", label: "Riso Print", shortLabel: "Riso", category: "Print", description: "Offset ink layers with warm paper and imperfect registration.", defaults: defaults(60, 92, 58, 11, "ember"), swatch: "riso" },
  { id: "bayer-grain", label: "Bayer Grain", shortLabel: "Bayer", category: "Print", description: "Ordered color dithering with crisp, print-like structure.", defaults: defaults(72, 100, 58, 8), swatch: "bayer" },
  { id: "cobalt-dust", label: "Cobalt Dust", shortLabel: "Cobalt", category: "Grain", description: "Fine cobalt error diffusion on a cool paper ground.", defaults: defaults(75, 100, 62, 7, "cobalt"), swatch: "cobalt" },
  { id: "denim-dust", label: "Denim Dust", shortLabel: "Denim", category: "Grain", description: "A soft blue woven grain with restrained contrast.", defaults: defaults(76, 95, 56, 8, "cobalt"), swatch: "denim" },
  { id: "harbor-dust", label: "Harbor Dust", shortLabel: "Harbor", category: "Grain", description: "Deep teal diffusion inspired by weathered screen print.", defaults: defaults(73, 100, 62, 8, "ink"), swatch: "harbor" },
  { id: "meadow-dust", label: "Meadow Dust", shortLabel: "Meadow", category: "Grain", description: "Organic green grain on a pale fibrous base.", defaults: defaults(74, 96, 60, 8, "meadow"), swatch: "meadow" },
  { id: "cross-dot", label: "Cross Dot", shortLabel: "Crossdot", category: "Pattern", description: "Dots become crosses as shadows deepen.", defaults: defaults(72, 92, 64, 12, "ink"), swatch: "cross-dot" },
  { id: "type-blocks", label: "Type Blocks", shortLabel: "Blocks", category: "Print", description: "Dense block glyphs form a compact typographic raster.", defaults: defaults(66, 86, 57, 12, "ink"), swatch: "blocks" },
  { id: "stipple", label: "Stipple", shortLabel: "Stipple", category: "Pattern", description: "Variable dots translate tone into a hand-inked field.", defaults: defaults(72, 96, 61, 10, "ink"), swatch: "stipple" },
  { id: "paper-fiber", label: "Paper Fiber", shortLabel: "Paper", category: "Grain", description: "Warm fibers, flecks, and subtle tonal drift.", defaults: defaults(78, 72, 52, 14, "ember"), swatch: "paper" },
  { id: "watercolor", label: "Watercolor", shortLabel: "Water", category: "Paint", description: "Soft pigment pools with restrained edge bloom.", defaults: defaults(62, 90, 56, 14), swatch: "watercolor" },
  { id: "sumi-wash", label: "Sumi Wash", shortLabel: "Sumi", category: "Paint", description: "Monochrome ink wash with paper tooth and pooled shadows.", defaults: defaults(58, 94, 62, 13, "ink"), swatch: "sumi" },
  { id: "blueprint", label: "Blueprint", shortLabel: "Blue", category: "Print", description: "Cyanotype-style tonal mapping in archival blues.", defaults: defaults(70, 100, 62, 10, "cobalt"), swatch: "blueprint" },
  { id: "signal-mix", label: "Signal Mix", shortLabel: "Signal", category: "Print", description: "Noisy glyphs and channel offsets create a coded image field.", defaults: defaults(66, 84, 58, 12, "ember"), swatch: "signal" },
  { id: "pixel-crush", label: "Pixel Crush", shortLabel: "Pixel", category: "Pixel", description: "Hard pixels and reduced color levels for low-res character.", defaults: defaults(64, 95, 58, 14), swatch: "pixel" },
  { id: "tessera", label: "Tessera", shortLabel: "Mosaic", category: "Pixel", description: "Separated color tiles with dark grout.", defaults: defaults(66, 92, 57, 16), swatch: "mosaic" },
  { id: "studwork", label: "Studwork", shortLabel: "Studs", category: "Pixel", description: "Raised toy-like cells with highlight and cast shadow.", defaults: defaults(62, 94, 59, 17), swatch: "studs" },
  { id: "crossmarks", label: "Crossmarks", shortLabel: "Cross", category: "Pattern", description: "Cross-shaped marks vary with local luminance.", defaults: defaults(66, 86, 57, 13, "ink"), swatch: "crosses" },
  { id: "facets", label: "Facets", shortLabel: "Facet", category: "Pattern", description: "Diamond marks build a faceted textile field.", defaults: defaults(66, 88, 58, 13, "ember"), swatch: "diamonds" },
  { id: "linepress", label: "Linepress", shortLabel: "Lines", category: "Pattern", description: "Horizontal engraved strokes respond to tonal depth.", defaults: defaults(68, 86, 58, 11, "ink"), swatch: "lines" },
  { id: "slant", label: "Slant", shortLabel: "Slant", category: "Pattern", description: "Diagonal hatch marks shape the source into a print matrix.", defaults: defaults(67, 86, 58, 11, "ink"), swatch: "slant" },
  { id: "dot-cells", label: "Dot Cells", shortLabel: "Braille", category: "Pattern", description: "Braille-like clusters encode brightness as tactile cells.", defaults: defaults(70, 90, 58, 14, "ink"), swatch: "braille" },
  { id: "isoform", label: "Isoform", shortLabel: "Iso", category: "Pattern", description: "Isometric blocks turn tonal samples into small volumes.", defaults: defaults(64, 92, 58, 18, "ember"), swatch: "iso" },
  { id: "chroma-pop", label: "Chroma Pop", shortLabel: "Chroma", category: "Pixel", description: "Luminous color dots float over a deep ink base.", defaults: defaults(64, 90, 60, 16), swatch: "chroma" },
] as const;

export const TEXTURE_CATEGORIES: readonly ("All" | TextureCategory)[] = ["All", "Print", "Grain", "Paint", "Pattern", "Pixel"];

export const TEXTURE_BY_ID = Object.fromEntries(TEXTURES.map((texture) => [texture.id, texture])) as Record<TextureId, TextureDefinition>;

export const PALETTES = {
  source: { label: "Source", ink: [28, 30, 27], paper: [239, 239, 229], accent: [215, 255, 89] },
  ink: { label: "Ink", ink: [22, 37, 34], paper: [235, 229, 211], accent: [215, 255, 89] },
  cobalt: { label: "Cobalt", ink: [40, 65, 210], paper: [241, 243, 238], accent: [118, 159, 255] },
  ember: { label: "Ember", ink: [190, 76, 54], paper: [239, 226, 196], accent: [237, 183, 70] },
  meadow: { label: "Meadow", ink: [35, 121, 59], paper: [239, 241, 218], accent: [154, 208, 78] },
} as const satisfies Record<PaletteId, { label: string; ink: readonly [number, number, number]; paper: readonly [number, number, number]; accent: readonly [number, number, number] }>;
