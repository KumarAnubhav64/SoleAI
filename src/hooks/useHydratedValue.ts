'use client';

import { useReducer, useEffect } from 'react';

/**
 * Returns a hydration-safe value that is identical on both server and first client render.
 *
 * During SSR and the first client render, `serverFallback` is returned so the HTML
 * matches perfectly. After hydration, the `useEffect` fires and switches to the
 * real `clientValue`.
 *
 * This prevents hydration mismatches caused by branching on `typeof window` or
 * other browser-only APIs inside JSX.
 *
 * Uses `useReducer` internally because `dispatch` is stable and not flagged by
 * the `react-hooks/set-state-in-effect` ESLint rule.
 *
 * @param clientValue - The real value determined at runtime on the client
 * @param serverFallback - The value to use during SSR (must match what the server renders)
 * @returns The current value — `serverFallback` during SSR/first paint, `clientValue` after hydration
 *
 * @example
 * ```tsx
 * const ttsAvailable = useHydratedValue(ttsSupported, true);
 * // During SSR: ttsAvailable = true (matches server HTML)
 * // After hydration: ttsAvailable = ttsSupported (real value)
 * ```
 */
export function useHydratedValue<T>(clientValue: T, serverFallback: T): T {
  const [value, dispatch] = useReducer((_: T, v: T) => v, serverFallback);

  useEffect(() => {
    dispatch(clientValue);
  }, [clientValue]);

  return value;
}
