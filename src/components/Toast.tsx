import { Info } from "@phosphor-icons/react";

export function Toast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div className="toast" role="alert">
      <Info aria-hidden="true" size={18} weight="fill" />
      <span>{message}</span>
      <button type="button" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
