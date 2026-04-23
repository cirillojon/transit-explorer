import React, { useEffect, useRef } from "react";

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  const cancelBtnRef = useRef(null);

  // Escape to dismiss + initial focus on the safe (cancel) button so a
  // stray Enter doesn't accidentally confirm a destructive action.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    // Focus the cancel button on the next frame so the dialog is mounted.
    const id = requestAnimationFrame(() => cancelBtnRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
    };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role={danger ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={message ? "confirm-dialog-msg" : undefined}
      >
        <h3 id="confirm-dialog-title">{title}</h3>
        {message && (
          <p id="confirm-dialog-msg" className="modal-msg">
            {message}
          </p>
        )}
        <div className="modal-actions">
          <button
            ref={cancelBtnRef}
            className="modal-btn"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`modal-btn ${danger ? "modal-btn-danger" : "modal-btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
