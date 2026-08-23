import { ArrowCounterClockwise, ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import { formatBytes } from "../engine/math";
import type { ImageSource } from "../types";

export function SourceRail({
  source,
  onChoose,
  onClear,
  onUndo,
  canUndo,
}: {
  source: ImageSource | null;
  onChoose: () => void;
  onClear: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  return (
    <aside className="source-rail" aria-label="Source image">
      <div>
        <p className="eyebrow">Source</p>
        <button className="source-upload" type="button" onClick={onChoose}>
          <UploadSimple size={25} weight="bold" aria-hidden="true" />
          <span>{source ? "Replace" : "Choose"}</span>
        </button>
      </div>

      {source ? (
        <div className="source-meta">
          <div className="source-icon"><ImageSquare size={18} aria-hidden="true" /></div>
          <p title={source.name}>{source.name}</p>
          <span>{source.width} × {source.height}</span>
          <span>{formatBytes(source.bytes)}</span>
        </div>
      ) : (
        <p className="source-empty">PNG, JPEG, or WebP up to 50 MB.</p>
      )}

      <div className="rail-actions">
        <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo last adjustment">
          <ArrowCounterClockwise size={17} aria-hidden="true" />
          Undo
        </button>
        <button type="button" onClick={onClear} disabled={!source} title="Clear image">
          <Trash size={17} aria-hidden="true" />
          Clear
        </button>
      </div>

      <dl className="shortcut-list">
        <div><dt>Open</dt><dd>⌘ O</dd></div>
        <div><dt>Export</dt><dd>⌘ S</dd></div>
        <div><dt>Original</dt><dd>Space</dd></div>
      </dl>
    </aside>
  );
}
