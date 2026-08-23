# Grain Studio Design Specification

## Reference frame

Primary visual reference: `editor-reference.svg` and its rendered `editor-reference.png`.

The editor is one focused product surface, not a marketing landing page. Its hierarchy is:

1. Compact global toolbar
2. Source rail
3. Large image stage
4. Material inspector
5. Floating texture dock

## Visual direction

- Theme: deep graphite only
- Concept: precision instrument with tactile material controls
- ThreeUI influence: animated proximity dock, dark translucent surfaces, hairline borders, physical button feedback, compact mono metadata
- Reference-app influence: image-first canvas, local processing, one-click filter selection, drag and drop, full-resolution export
- Original contribution: adjustable material parameters, comparison scrubber, export formats and sizes, installable PWA, documented local-only privacy model

## Tokens

- Canvas: `#0d0e0c`
- Surface: `#171815`
- Surface raised: `#20211d`
- Hairline: `#31332d`
- Text: `#f1f2ea`
- Muted text: `#85887e`
- Accent: `#d7ff59`
- Success: `#65d89a`
- Error: `#ff745f`
- Main radius: 16px
- Control radius: 10px
- Dock item radius: 12px
- Shadow: broad, low-opacity black with a faint inset highlight

## Typography

- UI sans: Geist or a local modern grotesk fallback
- Metadata: Geist Mono or system monospace
- Product name: 15px, 700 weight, 0.12em tracking
- Inspector title: 26px, 600 weight
- Control labels: 11px
- Metadata: 9px to 10px

## Layout

At 1440px and wider:

- 24px outer page gutter
- 64px top toolbar
- 130px source rail
- Fluid image stage with an upper bound around 1024px
- 320px inspector
- 18px gaps
- 106px floating dock overlapping the lower edge of the image stage

At tablet widths:

- Source metadata moves into the toolbar
- Inspector becomes a 280px side panel
- Dock remains horizontally scrollable

At phone widths:

- Toolbar reduces to brand plus actions
- Canvas occupies the upper work area
- Inspector becomes a collapsible sheet
- Dock becomes a horizontal strip with fixed-size touch targets
- Compare uses a toggle instead of a tiny draggable handle

## Interaction model

- Upload from file picker, drag and drop, or clipboard paste
- Local browser processing only
- Filter dock magnifies nearby items on precise pointers
- Keyboard arrows cycle filters
- Space temporarily reveals the original
- `Ctrl/Cmd + O` opens an image
- `Ctrl/Cmd + S` opens export
- Sliders update the preview after an animation-frame debounce
- Compare scrubber overlays the original above the processed canvas
- Export dialog supports PNG, JPEG, and WebP with original, 2048px, and 4096px bounds
- Install action invokes the browser PWA prompt when available and shows platform guidance otherwise

## Required states

- Demo state: generated sample artwork with a clear Sample badge
- Empty state: upload target with format and privacy guidance
- Drag state: full-stage drop target
- Rendering state: thin activity meter and polite live status
- Error state: persistent inline alert with recovery action
- Exporting state: disabled export action with progress label
- Offline state: app shell and generated demo remain available

## Accessibility

- All icon controls have visible tooltips and accessible names
- Every filter is a button with `aria-pressed`
- Toolbar uses arrow-key navigation
- Range controls expose labels, values, and keyboard support
- Focus rings use the accent color with sufficient contrast
- Motion is removed when `prefers-reduced-motion` is enabled
- Touch targets are at least 44px

## Design constraints

- No nested-card maze
- No decorative status dots without meaning
- No gradient text
- One accent color throughout
- No copied branding, source, or images from the reference application
- ThreeUI-derived interaction code must retain MIT attribution in `THIRD_PARTY_NOTICES.md`
