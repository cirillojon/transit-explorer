import React, { useEffect, useRef } from "react";

/**
 * Detect the mobile platform to show appropriate "Add to Home Screen" tips.
 * Returns 'ios', 'android', or null.
 */
function detectMobilePlatform() {
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  // iOS: iPhone/iPod/iPad (including modern iPads that report MacIntel)
  if (
    /iP(hone|od|ad)/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
    return "ios";
  return null;
}

/**
 * Onboarding / how-to-use-the-map modal. Shown automatically the first
 * time a signed-in user lands on the app, and re-openable from the
 * floating "?" button on the map.
 */
function HelpModal({
  open,
  onClose,
  onDontShowAgain,
  showDontShowAgain = false,
}) {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the modal so keyboard users aren't stranded behind it.
    const id = requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  if (!open) return null;

  const platform = detectMobilePlatform();
  // The "tap any line directly to mark one hop" shortcut is desktop-only
  // (too easy to mis-tap on mobile), so don't advertise it on touch devices.
  const isCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  return (
    // Backdrop is the dialog itself; Escape closes it (see effect above),
    // so click-to-close on the overlay doesn't need a keyboard handler.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      className="help-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeBtnRef}
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
          Welcome aboard! Here&apos;s how to log your trip on the map.
        </p>

        <ol className="help-modal-steps">
          <li>
            <span className="help-modal-num">1</span>
            <div>
              <strong>Pick a route</strong> from the sidebar. The full route
              appears on the map.
            </div>
          </li>
          <li>
            <span className="help-modal-num">2</span>
            <div>
              <strong>Choose your direction</strong> using the tabs above the
              legend (e.g. <em>Toward Downtown</em>). The map only shows stops
              in that direction.
            </div>
          </li>
          <li>
            <span className="help-modal-num">3</span>
            <div>
              <strong>Tap your boarding stop</strong>. It turns into a pulsing
              green marker.
            </div>
          </li>
          <li>
            <span className="help-modal-num">4</span>
            <div>
              <strong>Tap your ending stop</strong> — anywhere ahead on the same
              direction. Every hop in between turns green and is added to your
              progress.
            </div>
          </li>
        </ol>

        <div className="help-modal-tip">
          <strong>When should I log?</strong> Either works:
          <ul>
            <li>
              <strong>Tap-and-go:</strong> tap your boarding stop when you
              board, then tap the ending stop when you get off. The app tracks
              your trip time between taps.
            </li>
            <li>
              <strong>After the fact:</strong> tap both stops back-to-back once
              you&apos;ve arrived. You won&apos;t get a trip-time measurement,
              but the segments still count.
            </li>
          </ul>
        </div>

        <div className="help-modal-tip">
          <strong>Shortcuts</strong>
          <ul>
            {!isCoarsePointer && (
              <li>Click any line directly to mark just that one hop.</li>
            )}
            <li>
              Press <kbd>Esc</kbd> or hit <em>Undo boarding</em> to cancel.
            </li>
            <li>Use the search box to jump to a stop by name.</li>
          </ul>
        </div>

        {platform === "ios" && (
          <div className="help-modal-tip help-modal-tip--install">
            <strong>📱 Add to Home Screen (iOS)</strong>
            <ol className="help-modal-install-steps">
              <li>
                Tap the <span className="help-modal-share-icon" role="img" aria-label="Share icon">⎙</span>{" "}
                <strong>Share</strong> button at the bottom of Safari.
              </li>
              <li>
                Scroll down and tap{" "}
                <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> — when prompted, select{" "}
                <strong>Open as Web App</strong> so it launches full-screen.
                The app icon will appear on your Home Screen.
              </li>
            </ol>
          </div>
        )}

        {platform === "android" && (
          <div className="help-modal-tip help-modal-tip--install">
            <strong>📱 Add to Home Screen (Android)</strong>
            <ol className="help-modal-install-steps">
              <li>
                Tap the <span role="img" aria-label="three-dot menu icon">⋮</span> menu in the top-right corner of
                Chrome.
              </li>
              <li>
                Tap <strong>Add to Home screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> — when prompted, select{" "}
                <strong>Open as Web App</strong> so it launches full-screen.
                The app icon will appear on your Home Screen.
              </li>
            </ol>
          </div>
        )}

        <div className="help-modal-actions">
          {showDontShowAgain && (
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
          )}
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
