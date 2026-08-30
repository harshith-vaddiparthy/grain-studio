import { Info } from "@phosphor-icons/react";
import { useEffect } from "react";

/* Confirmations previously stayed on screen until dismissed by hand. Since the
   editor now produces one after saving, sharing, and exporting, a lingering
   overlay became a nuisance that also sat over the right-hand end of the texture
   dock. It now clears itself, and the container ignores pointer events so it can
   never intercept a click meant for the artwork or the dock. Only the dismiss
   button remains interactive. */

export const TOAST_DURATION_MS = 6500;

export function Toast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <Info aria-hidden="true" size={18} weight="fill" />
      <span>{message}</span>
      <button type="button" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
