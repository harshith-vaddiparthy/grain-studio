import { DownloadSimple, FileImage } from "@phosphor-icons/react";
import { useMemo, useState, type CSSProperties } from "react";
import { exportDimensions } from "../engine/image";
import type { ExportFormat, ExportSize, ImageSource, TextureDefinition } from "../types";
import { Modal } from "./Modal";

export function ExportDialog({
  open,
  source,
  texture,
  exporting,
  onClose,
  onExport,
}: {
  open: boolean;
  source: ImageSource | null;
  texture: TextureDefinition;
  exporting: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat, size: ExportSize, quality: number) => Promise<void>;
}) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [size, setSize] = useState<ExportSize>("original");
  const [quality, setQuality] = useState(92);
  const dimensions = useMemo(() => source ? exportDimensions(source, size) : null, [source, size]);

  return (
    <Modal open={open} title="Export texture" description="Render a fresh file from the source image. Nothing is uploaded." onClose={onClose}>
      <div className="export-summary">
        <span className="export-icon"><FileImage size={22} aria-hidden="true" /></span>
        <div>
          <strong>{source?.name ?? "No image"}</strong>
          <span>{texture.label}{dimensions ? ` · ${dimensions.width} × ${dimensions.height}` : ""}</span>
        </div>
      </div>

      <fieldset className="option-fieldset">
        <legend>Format</legend>
        <div className="segmented-options">
          {(["png", "jpeg", "webp"] as const).map((item) => (
            <button key={item} type="button" className={format === item ? "is-active" : ""} aria-pressed={format === item} onClick={() => setFormat(item)}>{item.toUpperCase()}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="option-fieldset">
        <legend>Longest edge</legend>
        <div className="segmented-options four-up">
          {(["original", "4096", "2048", "1024"] as const).map((item) => (
            <button key={item} type="button" className={size === item ? "is-active" : ""} aria-pressed={size === item} onClick={() => setSize(item)}>{item === "original" ? "Original" : `${item}px`}</button>
          ))}
        </div>
      </fieldset>

      <label className={`quality-control${format === "png" ? " is-disabled" : ""}`} style={{ "--range-progress": `${((quality - 50) / 50) * 100}%` } as CSSProperties}>
        <span><span>Quality</span><output>{format === "png" ? "Lossless" : `${quality}%`}</output></span>
        <input type="range" min="50" max="100" value={quality} disabled={format === "png"} onChange={(event) => setQuality(Number(event.currentTarget.value))} />
      </label>

      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        <button className="primary-button" type="button" disabled={!source || exporting} onClick={() => onExport(format, size, quality)}>
          <DownloadSimple size={17} weight="bold" aria-hidden="true" />
          {exporting ? "Rendering" : "Download"}
        </button>
      </div>
    </Modal>
  );
}
