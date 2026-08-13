"use client";

import { useCallback, useRef } from "react";

/**
 * Distinguishes a single tap/click from a double tap on the same element,
 * the way Instagram's like-on-double-tap works. If `onSingleTap` is given,
 * it fires after `delay` ms unless a second tap arrives first.
 */
export function useDoubleTap(onDoubleTap: () => void, onSingleTap?: () => void, delay = 250) {
  const lastTapRef = useRef(0);
  const pendingSingleTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(() => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < delay;
    lastTapRef.current = isDoubleTap ? 0 : now;

    if (pendingSingleTapRef.current) {
      clearTimeout(pendingSingleTapRef.current);
      pendingSingleTapRef.current = null;
    }

    if (isDoubleTap) {
      onDoubleTap();
    } else if (onSingleTap) {
      pendingSingleTapRef.current = setTimeout(() => {
        pendingSingleTapRef.current = null;
        onSingleTap();
      }, delay);
    }
  }, [delay, onDoubleTap, onSingleTap]);
}
