import { useEffect, useState } from "react";

/**
 * Live "elapsed since boarding" counter, in ms. Returns 0 when no
 * boarding is active. Updates every second while a boarding pick is in
 * flight; cleans up its interval on unmount or when boarding ends.
 */
export default function useLiveTripTimer(boardedAt) {
  const [liveTripMs, setLiveTripMs] = useState(0);

  useEffect(() => {
    if (!boardedAt) {
      setLiveTripMs(0);
      return undefined;
    }
    setLiveTripMs(Date.now() - boardedAt);
    const id = setInterval(() => {
      setLiveTripMs(Date.now() - boardedAt);
    }, 1000);
    return () => clearInterval(id);
  }, [boardedAt]);

  return liveTripMs;
}
