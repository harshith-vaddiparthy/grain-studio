import { DownloadSimple, FileImage } from "@phosphor-icons/react";
import { useMemo, useState, type CSSProperties } from "react";
import { canUseWorkerExport, type ExportStage } from "../engine/export";
import { exportDimensions } from "../engine/image";
import type { ExportFormat, ExportSize, ImageSource, TextureDefinition } from "../types";
import { Modal } from "./Modal";

export function ExportDialog({
  open,
  source,
  texture,
  exporting,
  stage,
  onClose,
  onCancel,
  onExport,
}: {
  open: boolean;
  source: ImageSource | null;
  texture: TextureDefinition;
  exporting: boolean;
  stage?: ExportStage | null;
  onClose: () => void;
  onCancel?: () => void;
  onExport: (format: ExportFormat, size: ExportSize, quality: number, preserveTransparency: boolean) => Promise<void>;
}) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [size, setSize] = useState<ExportSize>("original");
  const [quality, setQuality] = useState(92);
  const [preserveTransparency, setPreserveTransparency] = useState(true);
  const workerCapable = canUseWorkerExport();
  const effectiveSize: ExportSize = !workerCapable && (size === "original" || size === "4096") ? "2048" : size;
  const dimensions = useMemo(() => source ? exportDimensions(source, effectiveSize) : null, [source, effectiveSize]);
  const originalClamped = Boolean(source && dimensions && size === "original" &&
    (dimensions.width !== source.width || dimensions.height !== source.height));
  const stageLabel = stage === "encoding" ? "Encoding file..." : stage === "rendering" ? "Rendering..." : "Preparing image...";

  return (
    <Modal open={open} title="Export texture" description="Render a fresh file from the source image. Nothing is uploaded." onClose={onClose}>
      <div className="export-summary">
        <span className="export-icon"><FileImage size={22} aria-hidden="true" /></span>
        <div>
          <strong>{source?.name ?? "No image"}</strong>
          <span>{texture.label}{dimensions ? ` · Output ${dimensions.width} × ${dimensions.height}` : ""}</span>
        </div>
      </div>
      {originalClamped && source && dimensions && (
        <p className="modal-description" role="status">Source size {source.width} × {source.height} is reduced to {dimensions.width} × {dimensions.height} for the {workerCapable ? "16 MP / 8,192 px" : "4 MP / 2,048 px fallback"} export limit.</p>
      )}

      <fieldset className="option-fieldset">
        <legend>Format</legend>
        <div className="segmented-options">
          {(["png", "jpeg", "webp"] as const).map((item) => (
            <button key={item} type="button" disabled={exporting} className={format === item ? "is-active" : ""} aria-pressed={format === item} onClick={() => setFormat(item)}>{item.toUpperCase()}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="option-fieldset">
        <legend>Longest edge · {workerCapable ? "max 8,192 px / 16 MP" : "max 2,048 px / 4 MP"}</legend>
        <div className="segmented-options four-up">
          {(["original", "4096", "2048", "1024"] as const).map((item) => (
            <button key={item} type="button" disabled={exporting || (!workerCapable && item === "4096")} className={size === item ? "is-active" : ""} aria-pressed={size === item} onClick={() => setSize(item)}>{item === "original" ? "Source (safe)" : `${item}px`}</button>
          ))}
        </div>
      </fieldset>

      <label className={`quality-control${format === "png" ? " is-disabled" : ""}`} style={{ "--range-progress": `${((quality - 50) / 50) * 100}%` } as CSSProperties}>
        <span><span>Quality</span><output>{format === "png" ? "Lossless" : `${quality}%`}</output></span>
        <input type="range" min="50" max="100" value={quality} disabled={format === "png" || exporting} onChange={(event) => setQuality(Number(event.currentTarget.value))} />
      </label>

      <fieldset className="option-fieldset">
        <legend>Transparency</legend>
        {format === "jpeg" ? (
          <p className="modal-description">JPEG has no transparency. Transparent areas will be flattened onto white.</p>
        ) : (
          <div className="segmented-options">
            <button type="button" disabled={exporting} className={preserveTransparency ? "is-active" : ""} aria-pressed={preserveTransparency} onClick={() => setPreserveTransparency(true)}>Keep source alpha</button>
            <button type="button" disabled={exporting} className={!preserveTransparency ? "is-active" : ""} aria-pressed={!preserveTransparency} onClick={() => setPreserveTransparency(false)}>White background</button>
          </div>
        )}
      </fieldset>

      {!workerCapable && (
        <p className="modal-description">This browser uses a main-thread fallback limited to 2048px. Rendering may briefly pause the page; cancellation cannot interrupt that synchronous stage.</p>
      )}

      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={exporting ? onCancel ?? onClose : onClose}>{exporting ? "Cancel export" : "Cancel"}</button>
        <button className="primary-button" type="button" disabled={!source || exporting} onClick={() => onExport(format, effectiveSize, quality, preserveTransparency)}>
          <DownloadSimple size={17} weight="bold" aria-hidden="true" />
          {exporting ? stageLabel : "Download"}
        </button>
      </div>
    </Modal>
  );
}
