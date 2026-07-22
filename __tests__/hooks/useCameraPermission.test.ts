import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCameraPermission } from '@/hooks/useCameraPermission';

// Mock navigator.mediaDevices.getUserMedia
function mockGetUserMedia(options: {
  shouldResolve?: boolean;
  errorName?: string;
  errorMessage?: string;
  stream?: MediaStream;
}) {
  const {
    shouldResolve = true,
    errorName = 'NotAllowedError',
    errorMessage = 'Permission denied',
    stream = {} as MediaStream,
  } = options;

  return vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(
    () =>
      shouldResolve
        ? Promise.resolve(stream)
        : Promise.reject(
            Object.assign(new Error(errorMessage), { name: errorName }),
          ),
  );
}

describe('useCameraPermission', () => {
  beforeEach(() => {
    // Ensure mediaDevices exists
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with idle status and no stream', () => {
      const { result } = renderHook(() => useCameraPermission());

      expect(result.current.status).toBe('idle');
      expect(result.current.stream).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('requestPermission', () => {
    it('should transition to granted and return stream on success', async () => {
      const mockStream = { getTracks: () => [] } as unknown as MediaStream;
      const mock = mockGetUserMedia({
        shouldResolve: true,
        stream: mockStream,
      });

      const { result } = renderHook(() => useCameraPermission());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(mock).toHaveBeenCalledWith({ video: true, audio: true });
      expect(result.current.status).toBe('granted');
      expect(result.current.stream).toBe(mockStream);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle NotAllowedError (denied)', async () => {
      mockGetUserMedia({
        shouldResolve: false,
        errorName: 'NotAllowedError',
        errorMessage: 'Permission denied',
      });

      const { result } = renderHook(() => useCameraPermission());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.status).toBe('denied');
      expect(result.current.stream).toBeNull();
      expect(result.current.error).toBe(
        'Camera and microphone access was denied. Please update your browser permissions to use this feature.',
      );
    });

    it('should handle NotFoundError (no camera)', async () => {
      mockGetUserMedia({
        shouldResolve: false,
        errorName: 'NotFoundError',
        errorMessage: 'Requested device not found',
      });

      const { result } = renderHook(() => useCameraPermission());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.status).toBe('unavailable');
      expect(result.current.error).toBe(
        'No camera or microphone detected. Please connect a device and try again.',
      );
    });

    it('should handle NotReadableError (device in use)', async () => {
      mockGetUserMedia({
        shouldResolve: false,
        errorName: 'NotReadableError',
        errorMessage: 'Device is busy',
      });

      const { result } = renderHook(() => useCameraPermission());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.status).toBe('unavailable');
      expect(result.current.error).toBe(
        'Your camera or microphone is already in use by another application. Please close that application and try again.',
      );
    });

    it('should handle generic errors', async () => {
      mockGetUserMedia({
        shouldResolve: false,
        errorName: 'UnknownError',
        errorMessage: 'Something went wrong',
      });

      const { result } = renderHook(() => useCameraPermission());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.status).toBe('denied');
      expect(result.current.error).toContain('Something went wrong');
    });

    it('should handle mediaDevices being undefined', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useCameraPermission());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.status).toBe('unavailable');
      expect(result.current.error).toBe(
        'Camera and microphone are not available in this environment. Please use a supported browser.',
      );
    });

    it('should show loading state during permission request', async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise!: (stream: MediaStream) => void;
      const mockStream = { getTracks: () => [] } as unknown as MediaStream;

      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(
        () =>
          new Promise<MediaStream>((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const { result } = renderHook(() => useCameraPermission());

      // Start permission request but don't await
      let promise: Promise<void>;
      act(() => {
        promise = result.current.requestPermission();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.status).toBe('idle');

      // Resolve
      await act(async () => {
        resolvePromise(mockStream);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe('granted');
    });
  });

  describe('retry', () => {
    it('should retry permission request after denial', async () => {
      // First call fails, second succeeds
      const mockStream = { getTracks: () => [] } as unknown as MediaStream;
      const mock = vi
        .spyOn(navigator.mediaDevices, 'getUserMedia')
        .mockRejectedValueOnce(
          Object.assign(new Error('Permission denied'), {
            name: 'NotAllowedError',
          }),
        )
        .mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useCameraPermission());

      // First attempt - denied
      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.status).toBe('denied');

      // Retry
      await act(async () => {
        await result.current.retry();
      });

      expect(mock).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe('granted');
      expect(result.current.stream).toBe(mockStream);
      expect(result.current.error).toBeNull();
    });
  });

  describe('stopStream', () => {
    it('should stop all tracks and clear stream', async () => {
      const track1 = { stop: vi.fn() } as unknown as MediaStreamTrack;
      const track2 = { stop: vi.fn() } as unknown as MediaStreamTrack;
      const mockStream = {
        getTracks: () => [track1, track2],
      } as unknown as MediaStream;

      mockGetUserMedia({ shouldResolve: true, stream: mockStream });

      const { result } = renderHook(() => useCameraPermission());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.status).toBe('granted');

      act(() => {
        result.current.stopStream();
      });

      expect(track1.stop).toHaveBeenCalled();
      expect(track2.stop).toHaveBeenCalled();
      expect(result.current.stream).toBeNull();
      expect(result.current.status).toBe('idle');
    });
  });

  describe('cleanup', () => {
    it('should stop stream tracks on unmount', async () => {
      const track1 = { stop: vi.fn() } as unknown as MediaStreamTrack;
      const track2 = { stop: vi.fn() } as unknown as MediaStreamTrack;
      const mockStream = {
        getTracks: () => [track1, track2],
      } as unknown as MediaStream;

      mockGetUserMedia({ shouldResolve: true, stream: mockStream });

      const { result, unmount } = renderHook(() => useCameraPermission());

      await act(async () => {
        await result.current.requestPermission();
      });

      unmount();

      expect(track1.stop).toHaveBeenCalled();
      expect(track2.stop).toHaveBeenCalled();
    });
  });
});
