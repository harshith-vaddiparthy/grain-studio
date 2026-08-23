import { ArrowSquareOut, CheckCircle, DeviceMobile, MonitorArrowUp } from "@phosphor-icons/react";
import { Modal } from "./Modal";

export function InstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Install Grain Studio" description="Keep the editor one tap away and use it offline after the first visit." onClose={onClose}>
      <div className="install-grid">
        <article>
          <MonitorArrowUp size={22} aria-hidden="true" />
          <div><strong>Desktop</strong><p>Open your browser menu and choose Install Grain Studio or Install app.</p></div>
        </article>
        <article>
          <DeviceMobile size={22} aria-hidden="true" />
          <div><strong>iPhone or iPad</strong><p>Tap Share, then choose Add to Home Screen.</p></div>
        </article>
        <article>
          <CheckCircle size={22} aria-hidden="true" />
          <div><strong>Private by design</strong><p>Your source images and rendered exports stay on this device.</p></div>
        </article>
      </div>
      <div className="modal-actions">
        <a className="secondary-button" href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing" target="_blank" rel="noreferrer">Learn more <ArrowSquareOut size={15} aria-hidden="true" /></a>
        <button className="primary-button" type="button" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  );
}
