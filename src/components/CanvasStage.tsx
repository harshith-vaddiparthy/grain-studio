import { ImageSquare, UploadSimple } from "@phosphor-icons/react";
import type { RefObject } from "react";
import type { ImageSource, RenderStatus, TextureDefinition } from "../types";

export function CanvasStage({
  source,
  texture,
  processedCanvasRef,
  originalCanvasRef,
  dimensions,
  compareEnabled,
  compare,
  revealOriginal,
  status,
  error,
  dragActive,
  onChoose,
  onCompareChange,
}: {
  source: ImageSource | null;
  texture: TextureDefinition;
  processedCanvasRef: RefObject<HTMLCanvasElement | null>;
  originalCanvasRef: RefObject<HTMLCanvasElement | null>;
  dimensions: { width: number; height: number };
  compareEnabled: boolean;
  compare: number;
  revealOriginal: boolean;
  status: RenderStatus;
  error: string | null;
  dragActive: boolean;
  onChoose: () => void;
  onCompareChange: (value: number) => void;
}) {
  const originalWidth = revealOriginal ? 100 : compareEnabled ? compare : 0;

  return (
    <section className={`canvas-stage${dragActive ? " is-dragging" : ""}`} id="workspace" aria-label="Texture preview">
      {source ? (
        <div className="preview-shell">
          <div className="preview-toolbar">
            <span className="material-name">{texture.label}</span>
            <div className="preview-status" aria-live="polite">
              <span className={`status-light status-${status}`} aria-hidden="true" />
              {status === "rendering" ? "Rendering" : error ? "Render error" : `${dimensions.width} × ${dimensions.height}`}
            </div>
          </div>
          <div className="canvas-wrap" style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}>
            <canvas ref={processedCanvasRef} aria-label={`${texture.label} processed preview`} />
            <div className="original-layer" style={{ clipPath: `inset(0 ${100 - originalWidth}% 0 0)` }} aria-hidden="true">
              <canvas ref={originalCanvasRef} />
            </div>
            {compareEnabled && !revealOriginal ? (
              <>
                <div className="compare-line" style={{ left: `${compare}%` }} aria-hidden="true">
                  <span>‹ ›</span>
                </div>
                <input
                  className="compare-input"
                  type="range"
                  min="0"
                  max="100"
                  value={compare}
                  aria-label={`Original image visible at ${compare} percent`}
                  onChange={(event) => onCompareChange(Number(event.currentTarget.value))}
                />
              </>
            ) : null}
            {source.isSample ? <span className="sample-badge">Sample</span> : null}
          </div>
          <p className="stage-hint">Hold Space for original. Drop or paste an image anywhere.</p>
        </div>
      ) : (
        <button className="empty-state" type="button" onClick={onChoose}>
          <span className="empty-icon"><ImageSquare size={30} weight="thin" aria-hidden="true" /></span>
          <strong>Bring in an image</strong>
          <span>Drop, paste, or choose a PNG, JPEG, or WebP.</span>
          <span className="empty-action"><UploadSimple size={15} aria-hidden="true" /> Choose image</span>
        </button>
      )}
      {dragActive ? (
        <div className="drop-overlay" aria-label="Drop image to open">
          <UploadSimple size={36} weight="thin" aria-hidden="true" />
          <strong>Drop to texture</strong>
        </div>
      ) : null}
    </section>
  );
}
