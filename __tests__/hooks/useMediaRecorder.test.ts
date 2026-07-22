import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';

// Mock MediaRecorder
function createMockMediaRecorder() {
  const mockRecorder = {
    start: vi.fn(() => {
      mockRecorder.state = 'recording';
    }),
    stop: vi.fn(() => {
      mockRecorder.state = 'inactive';
    }),
    pause: vi.fn(() => {
      mockRecorder.state = 'paused';
    }),
    resume: vi.fn(() => {
      mockRecorder.state = 'recording';
    }),
    state: 'inactive' as RecordingState,
    ondataavailable: null as ((e: BlobEvent) => void) | null,
    onstop: null as (() => void) | null,
    onerror: null as (() => void) | null,
    stream: null as MediaStream | null,
    mimeType: 'video/webm',
  };

  // Mock MediaRecorder constructor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RecorderCtor: any = vi.fn(function (stream: MediaStream, options?: MediaRecorderOptions) {
    mockRecorder.stream = stream;
    if (options?.mimeType) {
      mockRecorder.mimeType = options.mimeType;
    }
    return mockRecorder;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).MediaRecorder = RecorderCtor;

  // Mock static method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).MediaRecorder.isTypeSupported = vi.fn(() => true);

  return mockRecorder;
}

function createMockStream(): MediaStream {
  return { getTracks: () => [] } as unknown as MediaStream;
}

describe('useMediaRecorder', () => {
  beforeEach(() => {
    // Clear any previous mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).MediaRecorder;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with idle state and no blob', () => {
      const { result } = renderHook(() => useMediaRecorder(createMockStream()));

      expect(result.current.recordingState).toBe('idle');
      expect(result.current.blob).toBeNull();
      expect(result.current.durationMs).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should be disabled when no stream is provided', () => {
      const { result } = renderHook(() => useMediaRecorder(null));

      expect(result.current.isSupported).toBe(false);
      expect(result.current.recordingState).toBe('idle');
    });
  });

  describe('startRecording', () => {
    it('should start recording and transition to recording state', () => {
      const mockRecorder = createMockMediaRecorder();
      const { result } = renderHook(() => useMediaRecorder(createMockStream()));

      act(() => {
        result.current.startRecording();
      });

      expect(mockRecorder.start).toHaveBeenCalled();
      expect(result.current.recordingState).toBe('recording');
    });

    it('should do nothing if MediaRecorder is not supported', () => {
      const { result } = renderHook(() => useMediaRecorder(null));

      expect(result.current.isSupported).toBe(false);

      act(() => {
        result.current.startRecording();
      });

      expect(result.current.recordingState).toBe('idle');
    });

    it('should do nothing if already recording', () => {
      const mockRecorder = createMockMediaRecorder();
      const { result } = renderHook(() => useMediaRecorder(createMockStream()));

      act(() => {
        result.current.startRecording();
      });

      act(() => {
        result.current.startRecording(); // Second call
      });

      // Should only have called start once
      expect(mockRecorder.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopRecording', () => {
    it('should stop recording and produce a blob', () => {
      const mockRecorder = createMockMediaRecorder();
      const { result } = renderHook(() => useMediaRecorder(createMockStream()));

      act(() => {
        result.current.startRecording();
      });

      const blob = new Blob(['test'], { type: 'video/webm' });

      act(() => {
        result.current.stopRecording();
      });

      // stopRecording calls recorder.stop() -> now simulate the events
      // MediaRecorder fires after stop() completes
      expect(mockRecorder.stop).toHaveBeenCalled();

      act(() => {
        mockRecorder.ondataavailable?.({ data: blob } as BlobEvent);
        mockRecorder.onstop?.();
      });

      expect(result.current.recordingState).toBe('stopped');
      expect(result.current.blob).toStrictEqual(blob);
    });

    it('should do nothing if not recording', () => {
      const { result } = renderHook(() => useMediaRecorder(createMockStream()));

      act(() => {
        result.current.stopRecording();
      });

      expect(result.current.recordingState).toBe('idle');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const mockRecorder = createMockMediaRecorder();
      const { result } = renderHook(() => useMediaRecorder(createMockStream()));

      act(() => {
        result.current.startRecording();
      });

      // Produce blob
      const blob = new Blob(['test'], { type: 'video/webm' });
      act(() => {
        mockRecorder.ondataavailable?.({ data: blob } as BlobEvent);
        mockRecorder.onstop?.();
      });

      act(() => {
        result.current.stopRecording();
      });

      expect(result.current.recordingState).toBe('stopped');

      act(() => {
        result.current.reset();
      });

      expect(result.current.recordingState).toBe('idle');
      expect(result.current.blob).toBeNull();
      expect(result.current.durationMs).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('duration tracking', () => {
    it('should track recording duration', async () => {
      vi.useFakeTimers();
      createMockMediaRecorder();
      const { result } = renderHook(() => useMediaRecorder(createMockStream()));

      act(() => {
        result.current.startRecording();
      });

      // Wait 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.durationMs).toBeGreaterThanOrEqual(2000);

      act(() => {
        result.current.stopRecording();
      });

      vi.useRealTimers();
    });

    it('should stop interval timer on stop', () => {
      vi.useFakeTimers();
      const createSpy = vi.spyOn(globalThis, 'setInterval');

      const mockRecorder = createMockMediaRecorder();
      const { result } = renderHook(() => useMediaRecorder(createMockStream()));

      act(() => {
        result.current.startRecording();
      });

      expect(createSpy).toHaveBeenCalled();

      act(() => {
        mockRecorder.ondataavailable?.({
          data: new Blob(['test'], { type: 'video/webm' }),
        } as BlobEvent);
        mockRecorder.onstop?.();
        result.current.stopRecording();
      });

      // Duration should be frozen after stop
      const duration = result.current.durationMs;

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.durationMs).toBe(duration);

      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle MediaRecorder errors', () => {
      const mockRecorder = createMockMediaRecorder();
      const { result } = renderHook(() => useMediaRecorder(createMockStream()));

      act(() => {
        result.current.startRecording();
      });

      act(() => {
        mockRecorder.onerror?.();
      });

      expect(result.current.error).toBe('An error occurred during recording. Please try again.');
      expect(result.current.recordingState).toBe('error');
    });
  });
});
