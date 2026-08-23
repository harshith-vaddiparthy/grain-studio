# Contributing to Grain Studio

Thank you for helping improve the project.

## Development

```bash
pnpm install
pnpm dev
```

Before opening a pull request:

```bash
pnpm test
pnpm build
```

## Add a texture

1. Add a typed ID in `src/types.ts`.
2. Add its metadata and defaults in `src/data/filters.ts`.
3. Implement either a pixel transform or pattern renderer in `src/engine/render.ts`.
4. Add a resilient CSS fallback swatch in `src/styles.css`.
5. Add or update catalog tests.
6. Test the effect with portrait, landscape, bright, dark, and transparent inputs.

Texture names and algorithms must be original or compatible with the source license. Do not submit copied proprietary code, unlicensed fonts, or images without documented redistribution rights.

## Product requirements

- Image processing must remain local by default.
- Core editing must work without an account.
- Controls need keyboard and screen-reader support.
- Any continuous animation needs a reduced-motion fallback.
- Avoid adding dependencies when a small, tested browser implementation is sufficient.

## Pull requests

Keep changes focused. Explain the user-facing outcome, include verification commands, and attach before and after screenshots for visual changes.
