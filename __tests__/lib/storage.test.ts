import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveState, loadState, clearState } from '@/lib/storage';
import { STORAGE_KEY_PERSISTED_STATE } from '@/lib/constants';
import type { PersistedState } from '@/lib/types';
import { createDefaultPersistedState } from '@/lib/types';

// Mock localStorage with explicit typing for proper null return
const localStorageMock = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn<(key: string) => string | null>(
      (key: string) => store[key] ?? null,
    ),
    setItem: vi.fn<(key: string, value: string) => void>(
      (key: string, value: string) => {
        store[key] = value;
      },
    ),
    removeItem: vi.fn<(key: string) => void>((key: string) => {
      delete store[key];
    }),
    clear: vi.fn<() => void>(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn<(index: number) => string | null>(
      (index: number) => Object.keys(store)[index] ?? null,
    ),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('saveState', () => {
    it('should persist a state object to localStorage', () => {
      const state: PersistedState = {
        ...createDefaultPersistedState(),
        jobConfig: {
          equipmentType: 'hvac',
          severity: 'critical-fault',
        },
      };

      saveState(state);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY_PERSISTED_STATE,
        JSON.stringify(state),
      );
    });

    it('should handle errors gracefully when localStorage is full', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      const state = createDefaultPersistedState();

      // Should not throw
      expect(() => saveState(state)).not.toThrow();
    });

    it('should overwrite existing data', () => {
      const state1: PersistedState = {
        ...createDefaultPersistedState(),
        jobConfig: { equipmentType: 'hvac', severity: 'routine-maintenance' },
      };
      const state2: PersistedState = {
        ...createDefaultPersistedState(),
        jobConfig: { equipmentType: 'server-rack', severity: 'critical-fault' },
      };

      saveState(state1);
      saveState(state2);

      // Should have been called twice
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
      // Last call should be with state2
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
        STORAGE_KEY_PERSISTED_STATE,
        JSON.stringify(state2),
      );
    });
  });

  describe('loadState', () => {
    it('should return null when no data exists', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = loadState();
      expect(result).toBeNull();
    });

    it('should parse and return a valid persisted state', () => {
      const state: PersistedState = {
        ...createDefaultPersistedState(),
        jobConfig: {
          equipmentType: 'industrial-printer',
          severity: 'routine-maintenance',
        },
        scopingChat: [
          {
            id: '1',
            sender: 'expert',
            text: 'Hello',
            timestamp: 1000,
          },
        ],
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));

      const result = loadState();
      expect(result).toEqual(state);
    });

    it('should return null for invalid JSON', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-json');

      const result = loadState();
      expect(result).toBeNull();
    });

    it('should return null for non-object JSON', () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify('string'));

      const result = loadState();
      expect(result).toBeNull();
    });

    it('should return null when localStorage throws on getItem', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const result = loadState();
      expect(result).toBeNull();
    });
  });

  describe('clearState', () => {
    it('should remove the persisted state from localStorage', () => {
      clearState();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        STORAGE_KEY_PERSISTED_STATE,
      );
    });

    it('should not throw when clearing empty storage', () => {
      expect(() => clearState()).not.toThrow();
    });
  });

  describe('round-trip', () => {
    it('should save and load state correctly', () => {
      const state: PersistedState = {
        ...createDefaultPersistedState(),
        jobConfig: {
          equipmentType: 'hvac',
          severity: 'critical-fault',
        },
        progress: {
          configComplete: true,
          prepComplete: false,
          tabStatuses: {
            scoping: 'active',
            repair: 'locked',
            qa: 'locked',
          },
          currentTab: 'scoping',
        },
      };

      saveState(state);
      const loaded = loadState();

      expect(loaded).toEqual(state);
    });

    it('should return null after clearing', () => {
      const state = createDefaultPersistedState();
      saveState(state);
      clearState();
      const loaded = loadState();

      expect(loaded).toBeNull();
    });
  });
});
