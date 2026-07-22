import { STORAGE_KEY_PERSISTED_STATE } from '@/lib/constants';
import type { PersistedState } from '@/lib/types';

/**
 * Save the full persisted state to localStorage.
 * Swallows errors silently (e.g., QuotaExceededError) to prevent crashes.
 */
export function saveState(state: PersistedState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY_PERSISTED_STATE, serialized);
  } catch {
    // Storage quota exceeded or unavailable — fail silently
    console.warn('Failed to save state to localStorage');
  }
}

/**
 * Load the full persisted state from localStorage.
 * Returns null if no data exists, data is corrupted, or storage is unavailable.
 */
export function loadState(): PersistedState | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY_PERSISTED_STATE);
    if (serialized === null) {
      return null;
    }

    const parsed = JSON.parse(serialized);

    // Validate that it looks like a PersistedState object
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('jobConfig' in parsed) ||
      !('progress' in parsed) ||
      !('scopingChat' in parsed)
    ) {
      return null;
    }

    return parsed as PersistedState;
  } catch {
    // Invalid JSON or storage unavailable
    return null;
  }
}

/**
 * Remove the persisted state from localStorage entirely.
 */
export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PERSISTED_STATE);
  } catch {
    // Storage unavailable — fail silently
  }
}
