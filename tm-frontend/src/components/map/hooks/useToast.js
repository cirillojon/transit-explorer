import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Auto-dismissing toast state.
 *
 * Returns the current toast (or null) and a stable `showToast(msg, kind)`
 * setter. Repeated calls clear the previous timer so rapid toasts don't
 * dismiss each other prematurely. The interval is cleared on unmount.
 */
export default function useToast(durationMs = 2500) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback(
    (msg, kind = "success") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ msg, kind });
      timerRef.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { toast, showToast };
}
