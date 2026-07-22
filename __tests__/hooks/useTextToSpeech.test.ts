import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

// Track the last created utterance so the mock speak can fire its events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastUtterance: Record<string, any> | null = null;

function createMockSpeechSynthesis() {
  // Mock SpeechSynthesisUtterance constructor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const UtteranceCtor: any = vi.fn(function (this: any, text: string) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastUtterance = this;
    this.text = text;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).SpeechSynthesisUtterance = UtteranceCtor;

  const mockSynthesis = {
    speaking: false,
    pending: false,
    paused: false,
    cancel: vi.fn(() => {
      mockSynthesis.speaking = false;
    }),
    speak: vi.fn(function () {
      mockSynthesis.speaking = true;
      // Fire onstart asynchronously
      setTimeout(() => {
        if (lastUtterance?.onstart) lastUtterance.onstart(new Event('start'));
      }, 0);
      // Fire onend after a delay
      setTimeout(() => {
        mockSynthesis.speaking = false;
        if (lastUtterance?.onend) lastUtterance.onend(new Event('end'));
      }, 100);
    }),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
  };

  return mockSynthesis;
}

describe('useTextToSpeech', () => {
  let mockSpeechSynthesis: ReturnType<typeof createMockSpeechSynthesis>;

  beforeEach(() => {
    vi.useFakeTimers();
    lastUtterance = null;
    mockSpeechSynthesis = createMockSpeechSynthesis();

    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).SpeechSynthesisUtterance;
  });

  describe('initial state', () => {
    it('should start with isSpeaking false and isSupported true', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.isMuted).toBe(false);
    });

    it('should start muted when initialMuted is true', () => {
      const { result } = renderHook(() => useTextToSpeech({ muted: true }));

      expect(result.current.isMuted).toBe(true);
    });

    it('should report isSupported false when speechSynthesis is unavailable', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('speak', () => {
    it('should call window.speechSynthesis.speak with an utterance', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Hello world');
      });

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      // Verify the utterance was created with correct properties
      expect(lastUtterance?.text).toBe('Hello world');
      expect(lastUtterance?.rate).toBe(1.0);
      expect(lastUtterance?.pitch).toBe(1.0);
    });

    it('should set isSpeaking to true on start and false on end', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Hello');
      });

      // onstart fires asynchronously
      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current.isSpeaking).toBe(true);

      // onend fires after 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isSpeaking).toBe(false);
    });

    it('should not speak when muted', () => {
      const { result } = renderHook(() => useTextToSpeech({ muted: true }));

      act(() => {
        result.current.speak('Hello');
      });

      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    it('should not speak empty or whitespace text', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('');
      });

      act(() => {
        result.current.speak('   ');
      });

      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    it('should cancel previous speech before speaking new text', () => {
      const { result } = renderHook(() => useTextToSpeech());

      // speak() always calls cancel() first as a safety measure
      act(() => {
        result.current.speak('First message');
      });

      const cancelCountAfterFirst = mockSpeechSynthesis.cancel.mock.calls.length;

      act(() => {
        result.current.speak('Second message');
      });

      // Second speak should also call cancel (total increased)
      expect(mockSpeechSynthesis.cancel.mock.calls.length).toBeGreaterThan(cancelCountAfterFirst);
    });

    it('should do nothing when isSupported is false', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Hello');
      });

      // No error should be thrown
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('stop', () => {
    it('should cancel speech and set isSpeaking to false', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Hello');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current.isSpeaking).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('mute', () => {
    it('should toggle mute state', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.isMuted).toBe(false);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(true);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(false);
    });

    it('should stop speaking when toggling to mute', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Hello');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current.isSpeaking).toBe(true);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(true);
      expect(result.current.isSpeaking).toBe(false);
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should set mute state programmatically', () => {
      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.setMuted(true);
      });

      expect(result.current.isMuted).toBe(true);

      act(() => {
        result.current.setMuted(false);
      });

      expect(result.current.isMuted).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cancel speech on unmount', () => {
      const { result, unmount } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.speak('Hello');
      });

      unmount();

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });
});
