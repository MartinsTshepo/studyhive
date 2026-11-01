import { useEffect, useRef } from "react";
import Icon from "./Icon";

/**
 * Modal sheet. A bottom sheet with a grabber on phones, a centred window on larger screens.
 * Closes on Escape, on tapping the dimmed background, and on the close button, unless `dismissible` is false
 * (used while an upload is running).
 */
export default function Sheet({ open, onClose, title, children, dismissible = true }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  // Keep the latest onClose without re-running the focus effect on every render.
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    document.body.classList.add("is-locked");
    panelRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && dismissible) closeRef.current();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-locked");
      previouslyFocused?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panelRef}>
        <div className="sheet__grabber" aria-hidden="true" />
        <header className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          {dismissible && (
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <Icon name="x" size={18} strokeWidth={2.4} />
            </button>
          )}
        </header>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
