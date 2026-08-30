import { ArrowsClockwise, DiceFive, LinkSimple, SlidersHorizontal } from "@phosphor-icons/react";
import { PALETTES, TEXTURE_CATEGORIES } from "../data/filters";
import type { PaletteId, TextureCategory, TextureDefinition, TextureSettings } from "../types";
import { RangeControl } from "./RangeControl";

export function Inspector({
  texture,
  settings,
  category,
  onCategoryChange,
  onSettingsChange,
  onReset,
  onRandomize,
  onShare,
}: {
  texture: TextureDefinition;
  settings: TextureSettings;
  category: "All" | TextureCategory;
  onCategoryChange: (category: "All" | TextureCategory) => void;
  onSettingsChange: (patch: Partial<TextureSettings>) => void;
  onReset: () => void;
  onRandomize: () => void;
  onShare: () => void;
}) {
  return (
    <aside className="inspector" aria-label="Texture controls">
      <div className="inspector-heading">
        <span className="inspector-icon"><SlidersHorizontal size={17} aria-hidden="true" /></span>
        <div>
          <p className="eyebrow">Material</p>
          <h1>{texture.label}</h1>
        </div>
      </div>
      <p className="texture-description">{texture.description}</p>

      <div className="category-tabs" role="tablist" aria-label="Texture categories">
        {TEXTURE_CATEGORIES.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? "is-active" : ""} onClick={() => onCategoryChange(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="control-stack">
        <RangeControl id="intensity" label="Intensity" value={settings.intensity} onChange={(intensity) => onSettingsChange({ intensity })} />
        <RangeControl id="detail" label="Detail" value={settings.detail} onChange={(detail) => onSettingsChange({ detail })} />
        <RangeControl id="contrast" label="Contrast" value={settings.contrast} onChange={(contrast) => onSettingsChange({ contrast })} />
        <RangeControl id="scale" label="Scale" value={settings.scale} min={4} max={32} suffix=" px" onChange={(scale) => onSettingsChange({ scale })} />
      </div>

      <fieldset className="palette-fieldset">
        <legend>Ink palette</legend>
        <div className="palette-grid">
          {(Object.entries(PALETTES) as [PaletteId, (typeof PALETTES)[PaletteId]][]).map(([id, palette]) => (
            <button
              type="button"
              key={id}
              className={settings.palette === id ? "is-active" : ""}
              aria-label={`Use ${palette.label} palette`}
              aria-pressed={settings.palette === id}
              onClick={() => onSettingsChange({ palette: id })}
              title={palette.label}
            >
              <span style={{ background: `rgb(${palette.paper.join(" ")})` }} />
              <span style={{ background: `rgb(${palette.ink.join(" ")})` }} />
              <small>{palette.label}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="inspector-actions">
        <button className="secondary-button" type="button" onClick={onReset}>
          <ArrowsClockwise size={16} aria-hidden="true" />
          Reset
        </button>
        <button className="secondary-button" type="button" onClick={onRandomize}>
          <DiceFive size={16} aria-hidden="true" />
          Reseed
        </button>
        <button
          className="secondary-button share-action"
          type="button"
          onClick={onShare}
          title="Copy a link that opens this look. Your image is never included."
        >
          <LinkSimple size={16} aria-hidden="true" />
          Copy look link
        </button>
      </div>
    </aside>
  );
}
