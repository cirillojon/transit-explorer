import { useEffect, useState } from "react";
import { HELP_SEEN_KEY } from "../mapUtils";

/**
 * Manages the onboarding HelpModal state. On first mount, if the user
 * hasn't dismissed the help before, auto-opens the modal and flags it as
 * "auto-opened" so the modal can show the "Don't show again" button.
 *
 * `markSeen()` writes the sticky flag (called from the Don't-show-again
 * button in the modal). Wraps localStorage in try/catch so private-mode
 * browsers still work.
 */
export default function useFirstVisitHelp() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpAutoOpened, setHelpAutoOpened] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(HELP_SEEN_KEY);
      if (!seen) {
        setHelpAutoOpened(true);
        setHelpOpen(true);
      }
    } catch {
      /* localStorage disabled — skip auto-open */
    }
  }, []);

  const openHelp = () => {
    setHelpAutoOpened(false);
    setHelpOpen(true);
  };
  const closeHelp = () => setHelpOpen(false);
  const markSeen = () => {
    try {
      localStorage.setItem(HELP_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return { helpOpen, helpAutoOpened, openHelp, closeHelp, markSeen };
}
