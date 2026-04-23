import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Tracks the set of segments the user has just marked client-side, before
 * the server's `progress` payload catches up. Exposes:
 *
 * - `effectiveCompleted` — server truth ∪ optimistic
 * - `recentlyDone`       — same set, kept around briefly so the renderer
 *                          can play the "just-turned-green" pulse
 * - `addOptimistic(keys)` — paint immediately + start the pulse window
 * - `rollback(keys)`     — undo a failed optimistic mark
 * - `reset()`            — clear everything (e.g. on route change)
 *
 * Optimistic keys auto-prune as the server-confirmed `completedSegments`
 * grows to cover them, so the merged Set never grows unbounded.
 */
export default function useOptimisticCompletion(
  completedSegments,
  { pulseMs = 1600 } = {},
) {
  const [optimisticDone, setOptimisticDone] = useState(() => new Set());
  const [recentlyDone, setRecentlyDone] = useState(() => new Set());
  const recentTimerRef = useRef(null);

  // Drop optimistic keys once the server-confirmed prop set covers them.
  useEffect(() => {
    if (optimisticDone.size === 0) return;
    let changed = false;
    const next = new Set();
    for (const key of optimisticDone) {
      if (!completedSegments.has(key)) {
        next.add(key);
      } else {
        changed = true;
      }
    }
    if (changed) setOptimisticDone(next);
  }, [completedSegments, optimisticDone]);

  useEffect(
    () => () => {
      if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    },
    [],
  );

  const effectiveCompleted = useMemo(() => {
    if (optimisticDone.size === 0) return completedSegments;
    const merged = new Set(completedSegments);
    for (const k of optimisticDone) merged.add(k);
    return merged;
  }, [completedSegments, optimisticDone]);

  const addOptimistic = useCallback(
    (keys) => {
      if (!keys?.length) return;
      setOptimisticDone((prev) => {
        const next = new Set(prev);
        for (const k of keys) next.add(k);
        return next;
      });
      setRecentlyDone((prev) => {
        const next = new Set(prev);
        for (const k of keys) next.add(k);
        return next;
      });
      if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
      recentTimerRef.current = setTimeout(() => {
        setRecentlyDone(new Set());
        recentTimerRef.current = null;
      }, pulseMs);
    },
    [pulseMs],
  );

  const rollback = useCallback((keys) => {
    if (!keys?.length) return;
    setOptimisticDone((prev) => {
      const next = new Set(prev);
      for (const k of keys) next.delete(k);
      return next;
    });
    setRecentlyDone((prev) => {
      const next = new Set(prev);
      for (const k of keys) next.delete(k);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setOptimisticDone(new Set());
    setRecentlyDone(new Set());
  }, []);

  return { effectiveCompleted, recentlyDone, addOptimistic, rollback, reset };
}
