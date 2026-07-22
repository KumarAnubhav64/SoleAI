import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountdownReturn {
  /** Current number of seconds remaining */
  secondsRemaining: number;
  /** Whether the countdown has reached zero */
  isExpired: boolean;
  /** Whether the countdown is actively ticking */
  isRunning: boolean;
  /** Reset the countdown to the initial duration and restart */
  reset: () => void;
  /** Pause the countdown at the current value */
  pause: () => void;
  /** Resume the countdown from the current value */
  resume: () => void;
}

/**
 * A countdown timer hook.
 *
 * @param totalSeconds - Total countdown duration in seconds
 * @param onExpire - Callback invoked when countdown reaches zero
 * @param startPaused - If true, the countdown starts in a paused state
 */
export function useCountdown(
  totalSeconds: number,
  onExpire?: () => void,
  startPaused = false,
): UseCountdownReturn {
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(!startPaused);
  const [isExpired, setIsExpired] = useState(false);
  const onExpireRef = useRef(onExpire);
  const totalRef = useRef(totalSeconds);

  // Keep the callback ref current without triggering re-renders
  onExpireRef.current = onExpire;
  totalRef.current = totalSeconds;

  // Reset when totalSeconds changes
  useEffect(() => {
    setSecondsRemaining(totalSeconds);
    setIsExpired(false);
    setIsRunning(!startPaused);
  }, [totalSeconds, startPaused]);

  useEffect(() => {
    if (!isRunning || isExpired) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Clear interval first to prevent multiple calls
          clearInterval(interval);
          setIsExpired(true);
          setIsRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isExpired]);

  const reset = useCallback(() => {
    setSecondsRemaining(totalRef.current);
    setIsExpired(false);
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (!isExpired) {
      setIsRunning(true);
    }
  }, [isExpired]);

  return {
    secondsRemaining,
    isExpired,
    isRunning,
    reset,
    pause,
    resume,
  };
}
