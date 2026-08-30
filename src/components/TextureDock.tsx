import { useEffect, useRef } from "react";
import type { TextureDefinition, TextureId } from "../types";

export function TextureDock({
  textures,
  selected,
  thumbnails,
  onSelect,
}: {
  textures: readonly TextureDefinition[];
  selected: TextureId;
  thumbnails: Partial<Record<TextureId, string>>;
  onSelect: (id: TextureId) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelector<HTMLButtonElement>(`[data-texture-id="${selected}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selected, textures]);

  const reset = () => {
    rootRef.current?.querySelectorAll<HTMLElement>("[data-dock-item]").forEach((item) => item.style.removeProperty("--dock-lift"));
  };

  const updateProximity = (clientX: number) => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    root.querySelectorAll<HTMLElement>("[data-dock-item]").forEach((item) => {
      const bounds = item.getBoundingClientRect();
      const center = bounds.left + bounds.width / 2;
      const distance = Math.abs(clientX - center);
      const raw = Math.max(0, 1 - distance / 122);
      const influence = raw * raw * (3 - 2 * raw);
      item.style.setProperty("--dock-lift", influence.toFixed(3));
    });
  };

  return (
    <nav className="texture-dock" aria-label="Texture filters">
      <div
        ref={rootRef}
        className="texture-dock-scroll"
        role="toolbar"
        aria-label="Choose a texture"
        onPointerMove={(event) => updateProximity(event.clientX)}
        onPointerLeave={reset}
      >
        {textures.map((texture) => (
          <button
            type="button"
            key={texture.id}
            data-dock-item
            data-texture-id={texture.id}
            className={`texture-option swatch-${texture.swatch}${selected === texture.id ? " is-selected" : ""}`}
            aria-label={`${texture.label} — ${texture.job}`}
            aria-pressed={selected === texture.id}
            onClick={() => {
              onSelect(texture.id);
              reset();
            }}
          >
            <span className="texture-preview" style={thumbnails[texture.id] ? { backgroundImage: `url(${thumbnails[texture.id]})` } : undefined} aria-hidden="true" />
            <span className="texture-tooltip">{texture.job}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
