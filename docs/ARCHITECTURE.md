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

Exports are bounded by both an 8192px longest edge and 16,777,216 total pixels. A large square therefore exports at 4096×4096 rather than allocating an 8192×8192 canvas. The actual output dimensions and any reduction are visible before download. Source files remain capped at 50 MB and 100 million pixels. Dimensions are checked from at most the first 1 MiB of PNG, JPEG or WebP headers before browser decoding, then checked again against the decoded image. Unreadable or unusually large metadata headers are rejected rather than guessed.

## State

- `App.tsx` owns the current source, selected texture, per-texture settings, comparison state, export state, and install prompt.
- Every texture retains its own settings while the user moves through the dock.
- A bounded in-memory history stores the last 40 setting changes.
- Source object URLs are revoked on replacement and unmount.

## Texture families

Pixel transforms:

- Silver Grain (monochromatic noise applied to original RGB channels)
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

## Export execution and transparency

`src/engine/export.ts` snapshots the source and settings, creates an export-sized ImageBitmap and transfers it to a dedicated module worker, and reports preparing, rendering and encoding phases. A matching request ID correlates the response. Cancel, timeout, worker failure and success all close the bitmap and terminate that worker; failures are not silently retried. The app prevents simultaneous downloads using an immediate operation ref.

`src/engine/export.worker.ts` uses the same renderer on OffscreenCanvas. Unsupported browsers use an explicitly disclosed main-thread fallback limited to a 2048px edge and 4,194,304 pixels. That fallback can briefly pause the UI during synchronous rendering; cancellation is checked before and after rendering and during encoding, but cannot interrupt a synchronous render. PNG and WebP must be returned with their exact MIME types; an encoder fallback to a different format is rejected rather than given a misleading extension.

The renderer samples stylised effects against white, restores the original per-pixel alpha for PNG/WebP, and blends neutral film grain against original RGB values. JPEG and explicit white-background exports flatten before rendering. The preview displays a checkerboard behind transparent content. No image, bitmap or export is sent to a server.

Grain Studio is created and maintained by [Harshith Vaddiparthy](https://www.harshith.com/).
