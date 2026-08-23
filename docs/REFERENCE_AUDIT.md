# Public reference audit

This document records product behavior observed from public pages. It is a functional reference, not a source-code copy.

## Textures reference

URL: https://texture.fayaz.workers.dev/

Observed public behavior:

- One-screen, image-first editor
- Generated sample shown on load
- File input accepts PNG, JPEG, and WebP
- Drag and drop is supported
- 50 MB validation limit
- Local Canvas 2D processing
- 1400px maximum preview edge
- Horizontal magnifying filter dock
- Left and Right Arrow filter navigation
- Per-filter generated thumbnail previews
- Full-resolution PNG download action
- Render, error, empty, and drag-over feedback
- Reduced-motion handling
- 25 visible filter choices: Glyphfield, Risograph, Bitgrain, four grain variants, Dotcross, Typeblocks, Stipple, Paper, Watercolor, Ink Wash, Cyanotype, Signal Mix, Pixel Crush, Tessera, Studwork, Crossmarks, Facets, Linepress, Slant, Dot Cells, Isoform, and Chroma Pop

Independent implementation decisions in Grain Studio:

- Original effect names and independently written algorithms
- Four adjustable material controls instead of fixed per-filter values
- Five selectable palettes and deterministic reseeding
- Original/source comparison scrubber
- PNG, JPEG, and WebP output
- Multiple output sizes with an 8192px safety cap
- Clipboard paste
- Explicit local-only privacy messaging
- Installable PWA behavior
- Bounded setting history

## ThreeUI reference

Repository: https://github.com/MengTo/threeui

Audited revision: `fbc9b3d61b0ef4b2e93b42e4fffa617ca277429b`

Relevant public material:

- `src/shaders/animated-top-dock/AnimatedTopDock.tsx`
- `src/shaders/animated-top-dock/topDockController.ts`
- `src/shaders/community.css`
- `src/components/CheckpointSliderControl.tsx`
- `LICENSE`
- `ASSET-LICENSES.md`
- `THIRD_PARTY_NOTICES.md`

The repository is MIT licensed. The design patterns used here are the proximity-aware dock, dark translucent tool surfaces, tactile press states, mono metadata, restrained hairlines, and reduced-motion behavior. Grain Studio does not redistribute ThreeUI remote catalog thumbnails or previews.

## Legal boundary

The public reference application did not expose an open-source license in the inspected page. Grain Studio therefore reproduces product ideas and common image-processing techniques without copying its source files, brand, or sample image. ThreeUI reuse and attribution are documented separately in `THIRD_PARTY_NOTICES.md`.
