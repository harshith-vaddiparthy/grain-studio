import { MonitorArrowUp } from "@phosphor-icons/react";
import type { InstallOfferKind } from "../lib/install";

/* Shown once, immediately after someone exports a treatment of their own image.
   On iOS Safari there is no install event to fire, so the honest offer is the
   Share-sheet instruction rather than a button that cannot work. */

export function InstallOffer({
  kind,
  onInstall,
  onDismiss,
}: {
  kind: Exclude<InstallOfferKind, "none">;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <aside className="install-offer" role="status" aria-live="polite" aria-label="Install Grain Studio">
      <MonitorArrowUp size={18} aria-hidden="true" />
      <div className="install-offer-copy">
        <strong>Keep Grain Studio one tap away</strong>
        <p>
          {kind === "native"
            ? "Install it to work offline. Your images never leave this device."
            : "Tap Share, then Add to Home Screen. Your images never leave this device."}
        </p>
      </div>
      <div className="install-offer-actions">
        {kind === "native" && (
          <button className="primary-button" type="button" onClick={onInstall}>
            Install
          </button>
        )}
        <button className="secondary-button" type="button" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
