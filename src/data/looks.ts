/* Content for the search-addressable look pages.

   These are hand-written rather than templated. A generator that stamped out
   twenty-five near-identical pages would be exactly the thin programmatic surface
   that is not worth publishing, so only looks with something genuine to explain
   get a page, and each explanation describes what the renderer actually does.

   Recipes are derived from the live catalog through the real encoder, so a page
   can never drift from the effect it documents. */

import { TEXTURE_BY_ID } from "./filters";
import { encodeRecipe } from "../lib/recipe";
import type { TextureId } from "../types";

export type LookPage = {
  slug: string;
  textureId: TextureId;
  job: string;
  title: string;
  summary: string;
  intro: string;
  how: readonly string[];
  controls: readonly (readonly [string, string])[];
  goodFor: readonly string[];
  notFor: string;
};

const PAGES: readonly LookPage[] = [
  {
    slug: "paper-texture",
    textureId: "paper-fiber",
    job: "Paper texture",
    title: "Paper texture effect for images, in your browser",
    summary:
      "Lay an image onto warm stock with fibre, tonal drift, and sparse flecks. Runs locally in the browser, so the source never leaves your device.",
    intro:
      "Flat digital artwork reads as flat because it has no substrate. Paper Fiber puts one underneath: the image is settled onto a paper ground and then disturbed by the three things that actually make stock look like stock.",
    how: [
      "The image is blended seventy percent of the way over a paper ground, so the paper keeps a real presence in the highlights instead of being a texture pasted on top.",
      "A broad value drift is added from smooth noise at a fourteen-unit amplitude, which is the slow unevenness you see when you tilt a printed sheet to the light.",
      "A second, deliberately stretched noise layer runs at one fifth the horizontal frequency of the vertical. That anisotropy is what reads as fibre rather than as generic grain.",
      "Roughly one pixel in a hundred is darkened sharply to stand in for the specks and inclusions in uncoated stock.",
    ],
    controls: [
      ["Scale", "Sets the fibre and drift frequency. Lower values give tight, dense tooth; higher values give the loose unevenness of heavier stock."],
      ["Contrast", "Applied to the image before it meets the paper, so it changes how much the stock shows through the midtones."],
      ["Intensity", "Opacity of the paper layer over the untouched image. Below about eighty the original reads through the stock, which keeps fine detail while still gaining a substrate."],
      ["Ink palette", "Chooses the paper colour. Ember is warm and uncoated; Ink is cooler and closer to a book page."],
      ["Reseed", "Redraws the fibre and fleck distribution without touching anything else. Useful when a fleck lands somewhere awkward."],
    ],
    goodFor: ["Poster and album artwork that needs a physical substrate", "Editorial layouts and zines", "Softening artwork that looks too clean or too digital"],
    notFor: "Images where fine detail must stay legible at small sizes; the fleck and fibre layers compete with small type.",
  },
  {
    slug: "risograph-print",
    textureId: "riso-print",
    job: "Risograph print",
    title: "Risograph print effect for images, in your browser",
    summary:
      "A real four-ink separation with rotated halftone screens and imperfect registration, on warm stock. Processed locally in the browser.",
    intro:
      "Most risograph filters tint an image and add noise. This one separates it the way a duplicator actually would, then screens each ink at its own angle, which is where the characteristic moire and colour breakup come from.",
    how: [
      "The image is separated into four channels using an under-colour split, so a black component is pulled out rather than being built from all three inks at once.",
      "Each channel is assigned a spot ink: a teal, a red-orange, a yellow, and a near-black green. These are mixed subtractively, so overlapping inks darken as real ink does.",
      "Every layer is screened on its own rotated grid, at roughly eighteen, minus fourteen, zero, and forty-two degrees. Separate angles are what stop the four screens from collapsing into one pattern.",
      "Dot size is driven by area, not by radius, so ink coverage stays perceptually correct as tone changes.",
      "The stock is a warm off-white, and a per-cell value wobble stands in for uneven drum inking.",
    ],
    controls: [
      ["Detail", "Sets the screen ruling. Lower detail gives a coarser, more obviously mechanical dot; higher detail tightens it toward offset."],
      ["Contrast", "Applied before separation, so it changes how much black is pulled out versus built from coloured inks."],
      ["Intensity", "How completely the separation replaces the original. Lowering it reintroduces the original colour beneath the four inks, which softens the effect without coarsening the screen."],
      ["Scale", "Adjusts the cell geometry the screens are laid on."],
      ["Reseed", "Changes the inking wobble, which shifts the character of the imperfection without changing the separation."],
    ],
    goodFor: ["Gig posters and print-feel promotional artwork", "Zines and small-run editorial", "Giving flat digital illustration a printed provenance"],
    notFor: "Work that must reproduce a brand colour exactly; the separation deliberately reinterprets colour through four fixed inks.",
  },
  {
    slug: "halftone-effect",
    textureId: "cross-dot",
    job: "Halftone crosses",
    title: "Halftone effect for images, in your browser",
    summary:
      "A halftone whose marks change shape as tone deepens: nothing, then dots, then crosses. Rendered locally in the browser.",
    intro:
      "A conventional halftone varies one dot's size. Cross Dot varies the mark itself, so shadows gain structure rather than just filling in. It behaves more like an engraver's decision than a printer's screen.",
    how: [
      "The image is divided into cells and each cell is reduced to a single tone, which decides what mark that cell gets.",
      "Cells below roughly eight percent darkness are left empty, so highlights stay genuinely blank instead of dusty.",
      "Between eight and thirty-two percent, the cell gets a small dot whose radius grows gently with tone.",
      "Past thirty-two percent the mark switches to a cross, whose arm reach and stroke weight both grow with darkness, and the deepest cells gain a further element.",
      "Because the transitions are thresholds rather than a smooth ramp, tonal bands stay visually separable, which is what keeps the result readable when printed in one colour.",
    ],
    controls: [
      ["Scale", "Cell size, and therefore the screen ruling. This is the control that decides how coarse the halftone reads."],
      ["Contrast", "Moves tones across the empty, dot, and cross thresholds, so it changes mark distribution rather than just brightness."],
      ["Intensity", "Opacity of the halftone layer over the untouched image. At one hundred you see only marks and ground; lower values let the original photograph show through between the crosses."],
      ["Ink palette", "Ink keeps it a single-colour print; the coloured palettes push it toward screen-print territory."],
    ],
    goodFor: ["Single-colour print and photocopy aesthetics", "Editorial portraits that need graphic structure", "Artwork that must survive being printed cheaply"],
    notFor: "Small output sizes. The mark vocabulary needs enough pixels per cell to be legible.",
  },
  {
    slug: "cyanotype-blueprint",
    textureId: "blueprint",
    job: "Cyanotype blueprint",
    title: "Cyanotype and blueprint effect for images, in your browser",
    summary:
      "Map an image through archival blues, from deep navy to pale wash, with fine exposure grain. Processed locally in the browser.",
    intro:
      "A cyanotype is not a blue tint over a photograph. It is a single-channel process: the original colour is discarded entirely and tone alone decides the result. Blueprint works the same way, which is why it looks like a print rather than a filter.",
    how: [
      "Colour is reduced to perceptual luminance first, so the mapping responds to how light something looks rather than to its hue.",
      "Contrast is applied with a slight upward bias, because the historical process is contrastier than a straight photographic curve.",
      "Tone is then mapped through a two-segment gradient: deep navy into cyan-blue across the shadows, then cyan-blue into a pale paper wash across the highlights. The midpoint hinge is what gives the deep shadows their weight.",
      "A fine per-pixel value grain is added to stand in for uneven exposure across a hand-coated sheet.",
    ],
    controls: [
      ["Contrast", "The most consequential control here, because it decides where the shadow and highlight segments meet the image's tones."],
      ["Intensity", "How completely the blue mapping replaces the original. The effect is composited over the untouched image, so reducing this reintroduces the original colour as a wash."],
      ["Reseed", "Redraws the per-pixel exposure grain from a new seed without touching the tonal mapping, which helps when the grain clashes with fine detail."],
      ["Ink palette", "Cobalt is the archival default; the others move it away from cyanotype toward other monochrome processes."],
    ],
    goodFor: ["Architectural and technical imagery", "Botanical and still-life studies, the process's original subjects", "Monochrome artwork that needs a historical register"],
    notFor: "Images that depend on colour to be understood, since hue is discarded before mapping.",
  },
  {
    slug: "pixelate-image",
    textureId: "pixel-crush",
    job: "Pixelate",
    title: "Pixelate an image, in your browser",
    summary:
      "Average an image into hard cells and reduce its colour depth, for deliberate low-resolution character. Runs locally in the browser.",
    intro:
      "Pixelating by resizing gives you soft, muddy blocks, because the resampler blends. Pixel Crush does the two things that make low-resolution work read as intentional: it averages honestly, and it also cuts the number of colours.",
    how: [
      "Each cell is averaged from the pixels it covers, so a block represents its region rather than sampling one arbitrary pixel from it.",
      "Every channel is then quantised to a small number of levels, four or six depending on the detail setting. This colour reduction is the part most pixelation effects omit, and it is what gives the result its era-appropriate palette.",
      "Cells are filled as hard rectangles with a deliberate half-pixel overlap, so no seams appear between blocks at any zoom level.",
    ],
    controls: [
      ["Scale", "Block size. This is the primary control and effectively sets the output resolution."],
      ["Detail", "Above sixty it allows six levels per channel; below, four. The difference between a richer and a starker palette."],
      ["Contrast", "Applied before quantisation, so it changes which levels the tones land on."],
      ["Intensity", "Opacity of the pixelated layer over the untouched image. Slightly below one hundred keeps a faint impression of the original edges beneath the blocks."],
      ["Ink palette", "Source keeps the original colours; the others recolour the reduced palette."],
    ],
    goodFor: ["Deliberate retro and low-fidelity artwork", "Obscuring a region while keeping composition readable", "Album and game-adjacent artwork"],
    notFor: "Anonymising sensitive material. Averaged blocks can retain recoverable structure and should never be relied on for redaction.",
  },
  {
    slug: "ascii-art",
    textureId: "glyph-weave",
    job: "ASCII art",
    title: "Turn an image into ASCII art, in your browser",
    summary:
      "Rebuild an image from monospaced characters chosen by local brightness, on a cell grid that respects character proportions. Runs locally in the browser.",
    intro:
      "ASCII art works when the character grid matches the shape of the characters. Glyph Weave samples the image into cells that are taller than they are wide, which is how monospaced type actually sits, so the result stays proportional instead of looking vertically squashed.",
    how: [
      "The image is sampled into cells whose rows are around one and a half times their column width, matching monospaced character metrics.",
      "Each cell's tone selects a glyph from a density ramp, so darker regions receive visually heavier characters.",
      "Glyphs are drawn at close to the full cell height in a semi-bold weight, which keeps the ramp's density differences readable rather than washing them out.",
      "Character colour follows the chosen palette, so the output is a typographic image rather than terminal output.",
    ],
    controls: [
      ["Scale", "Cell size, and therefore how many characters the image is rebuilt from. The single most important control."],
      ["Detail", "Adjusts how tone maps onto the density ramp."],
      ["Contrast", "Applied before sampling, so it separates the glyph choices in the midtones."],
      ["Intensity", "Opacity of the character layer over the untouched image. At one hundred the image is only type; lower values leave the photograph faintly visible behind the glyphs."],
      ["Ink palette", "Ink reads as print; the coloured palettes read as screen."],
    ],
    goodFor: ["Developer and technical brand artwork", "Terminal and code-adjacent visual identity", "Portraits that need to be abstracted rather than retouched"],
    notFor: "Small reproduction. Every character must be resolvable or the image collapses into noise.",
  },
];

export const LOOKS = PAGES.map((page) => ({
  ...page,
  /* Settings-only, so a look page can hand someone the exact effect without ever
     involving an image. */
  recipe: encodeRecipe(page.textureId, TEXTURE_BY_ID[page.textureId].defaults),
}));

export type Look = (typeof LOOKS)[number];

export const SITE = {
  origin: "https://grainstudio.harshith.com",
  name: "Grain Studio",
  tagline: "Local image textures",
  repository: "https://github.com/harshith-vaddiparthy/grain-studio",
} as const;
