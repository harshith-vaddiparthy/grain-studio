# Architecture

## Product boundary

Grain Studio is a static client application. It does not require a database, API, user account, or object storage. Files are decoded and rendered inside the current browser tab.

## Rendering flow

1. `src/engine/image.ts` validates and decodes a selected PNG, JPEG, or WebP.
2. `useTexturePreview` scales the source to a maximum 1280px edge for responsive editing.
3. `src/engine/render.ts` draws a normalized source canvas.
4. Pixel textures transform an RGBA buffer. Pattern textures sample local cells and draw marks into a second canvas.
5. The selected intensity blends the effect canvas over the source.
6. Export repeats the render at the requested output size and encodes the result with `canvas.toBlob`.

The longest export edge is capped at 8192px to avoid common browser canvas memory failures.

## State

- `App.tsx` owns the current source, selected texture, per-texture settings, comparison state, export state, and install prompt.
- Every texture retains its own settings while the user moves through the dock.
- A bounded in-memory history stores the last 40 setting changes.
- Source object URLs are revoked on replacement and unmount.

## Texture families

Pixel transforms:

- Riso Print
- Bayer Grain
- Cobalt, Denim, Harbor, and Meadow Dust
- Paper Fiber
- Watercolor
- Sumi Wash
- Blueprint

Pattern renderers:

- Glyph Weave and Type Blocks
- Stipple and Cross Dot
- Signal Mix
- Pixel Crush, Tessera, and Studwork
- Crossmarks, Facets, Linepress, and Slant
- Dot Cells, Isoform, and Chroma Pop

## Offline and installation

`public/manifest.webmanifest` defines the installable app. `public/sw.js` caches the shell and runtime-fetched same-origin assets. Service-worker registration only runs in production builds.

## Performance decisions

- Preview images are bounded to 1280px on the longest edge.
- Dock thumbnails render at 78px and are scheduled incrementally.
- Slider updates are rendered in the next animation frame.
- Full-size work occurs only after an explicit export action.
- No source image is serialized into React state.

A future version can move the renderer into an `OffscreenCanvas` worker without changing the filter catalog or UI contract.
