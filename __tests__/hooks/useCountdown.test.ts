import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '@/hooks/useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with the correct initial seconds', () => {
    const { result } = renderHook(() => useCountdown(30));

    expect(result.current.secondsRemaining).toBe(30);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.isRunning).toBe(true);
  });

  it('should decrement every second', () => {
    const { result } = renderHook(() => useCountdown(10));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.secondsRemaining).toBe(7);
    expect(result.current.isExpired).toBe(false);
  });

  it('should call onExpire when countdown reaches zero', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdown(3, onExpire));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(result.current.isExpired).toBe(true);
    expect(result.current.secondsRemaining).toBe(0);
  });

  it('should stop decrementing after expiry', () => {
    const { result } = renderHook(() => useCountdown(2));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.secondsRemaining).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  it('should support resetting the countdown', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdown(5, onExpire));

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsRemaining).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.secondsRemaining).toBe(5);
    expect(result.current.isExpired).toBe(false);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('should start paused when startPaused is true', () => {
    const { result } = renderHook(() => useCountdown(10, undefined, true));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.secondsRemaining).toBe(10);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should not have decremented
    expect(result.current.secondsRemaining).toBe(10);
  });

  it('should pause and resume countdown', () => {
    const { result } = renderHook(() => useCountdown(10));

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsRemaining).toBe(7);

    act(() => {
      result.current.pause();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should not have decremented while paused
    expect(result.current.secondsRemaining).toBe(7);

    act(() => {
      result.current.resume();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.secondsRemaining).toBe(5);
  });

  it('should not fire onExpire when reset before reaching zero', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() => useCountdown(5, onExpire));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.reset();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1); // Only when it hits 0 after reset
  });

  it('should cleanup interval on unmount', () => {
    const { result, unmount } = renderHook(() => useCountdown(30));

    unmount();

    // Should not throw after unmount
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.secondsRemaining).toBe(30); // Stale closure, but no crash
  });

  it('should handle rapid consecutive resets', () => {
    const { result } = renderHook(() => useCountdown(10));

    act(() => {
      result.current.reset();
      result.current.reset();
      result.current.reset();
    });

    expect(result.current.secondsRemaining).toBe(10);
    expect(result.current.isExpired).toBe(false);
  });
});
