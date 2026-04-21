import React, { useEffect } from "react";

/**
 * Onboarding / how-to-use-the-map modal. Shown automatically the first
 * time a signed-in user lands on the app, and re-openable from the
 * floating "?" button on the map.
 */
function HelpModal({ open, onClose, onDontShowAgain }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="help-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={onClose}
    >
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="help-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <h2 id="help-modal-title" className="help-modal-title">
          🚌 How to log a ride
        </h2>
        <p className="help-modal-lead">
          Three taps on the map turn the route line green. Watch for the
          glow — that means the segment was just saved.
        </p>

        <ol className="help-modal-steps">
          <li>
            <span className="help-modal-num">1</span>
            <div>
              <strong>Pick a route</strong> from the sidebar. The full
              route appears on the map.
            </div>
          </li>
          <li>
            <span className="help-modal-num">2</span>
            <div>
              <strong>Choose your direction</strong> using the tabs above
              the legend (e.g. <em>Toward Downtown</em>). The map only
              shows stops in that direction.
            </div>
          </li>
          <li>
            <span className="help-modal-num">3</span>
            <div>
              <strong>Tap your boarding stop</strong>. It turns into a
              pulsing yellow marker.
            </div>
          </li>
          <li>
            <span className="help-modal-num">4</span>
            <div>
              <strong>Tap your alighting stop</strong> — anywhere ahead
              on the same direction. Every hop in between turns green
              and is added to your progress.
            </div>
          </li>
        </ol>

        <div className="help-modal-tip">
          <strong>When should I log?</strong> Either works:
          <ul>
            <li>
              <strong>Tap-and-go:</strong> tap your boarding stop when
              you board, then tap the alighting stop when you get off.
              The app tracks your trip time between taps.
            </li>
            <li>
              <strong>After the fact:</strong> tap both stops back-to-back
              once you&apos;ve arrived. You won&apos;t get a trip-time
              measurement, but the segments still count.
            </li>
          </ul>
        </div>

        <div className="help-modal-tip">
          <strong>Shortcuts</strong>
          <ul>
            <li>Tap any line directly to mark just that one hop.</li>
            <li>Press <kbd>Esc</kbd> or hit <em>Undo boarding</em> to cancel.</li>
            <li>Use the search box to jump to a stop by name.</li>
          </ul>
        </div>

        <div className="help-modal-actions">
          <button
            type="button"
            className="help-modal-secondary"
            onClick={() => {
              onDontShowAgain?.();
              onClose?.();
            }}
          >
            Don&apos;t show this again
          </button>
          <button
            type="button"
            className="help-modal-primary"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
