import { X } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? "modal-description" : undefined}>
        <header className="modal-header">
          <div>
            <p className="eyebrow">Grain Studio</p>
            <h2 id="modal-title">{title}</h2>
            {description ? <p id="modal-description" className="modal-description">{description}</p> : null}
          </div>
          <button ref={closeRef} className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
