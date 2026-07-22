import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabState } from '@/hooks/useTabState';
import type { TabRecord } from '@/lib/types';

describe('useTabState', () => {
  it('should start with scoping active and others locked by default', () => {
    const { result } = renderHook(() => useTabState());

    expect(result.current.tabStatuses.scoping).toBe('active');
    expect(result.current.tabStatuses.repair).toBe('locked');
    expect(result.current.tabStatuses.qa).toBe('locked');
    expect(result.current.activeTab).toBe('scoping');
  });

  it('should accept custom initial state', () => {
    const initial: TabRecord = {
      scoping: 'completed',
      repair: 'active',
      qa: 'locked',
    };

    const { result } = renderHook(() => useTabState(initial));

    expect(result.current.tabStatuses).toEqual(initial);
    expect(result.current.activeTab).toBe('repair');
  });

  it('should complete scoping tab and unlock repair when calling completeTab', () => {
    const { result } = renderHook(() => useTabState());

    act(() => {
      result.current.completeTab('scoping');
    });

    expect(result.current.tabStatuses.scoping).toBe('completed');
    expect(result.current.tabStatuses.repair).toBe('active');
    expect(result.current.tabStatuses.qa).toBe('locked');
    expect(result.current.activeTab).toBe('repair');
  });

  it('should complete repair tab and unlock qa when calling completeTab', () => {
    const initial: TabRecord = {
      scoping: 'completed',
      repair: 'active',
      qa: 'locked',
    };

    const { result } = renderHook(() => useTabState(initial));

    act(() => {
      result.current.completeTab('repair');
    });

    expect(result.current.tabStatuses.repair).toBe('completed');
    expect(result.current.tabStatuses.qa).toBe('active');
    expect(result.current.activeTab).toBe('qa');
  });

  it('should complete the final tab without unlocking anything', () => {
    const initial: TabRecord = {
      scoping: 'completed',
      repair: 'completed',
      qa: 'active',
    };

    const { result } = renderHook(() => useTabState(initial));

    act(() => {
      result.current.completeTab('qa');
    });

    expect(result.current.tabStatuses.qa).toBe('completed');
    expect(result.current.activeTab).toBeNull();
  });

  it('should not complete a locked tab', () => {
    const { result } = renderHook(() => useTabState());

    act(() => {
      result.current.completeTab('repair');
    });

    expect(result.current.tabStatuses.repair).toBe('locked');
    expect(result.current.activeTab).toBe('scoping');
  });

  it('should not complete an already completed tab', () => {
    const initial: TabRecord = {
      scoping: 'completed',
      repair: 'active',
      qa: 'locked',
    };

    const { result } = renderHook(() => useTabState(initial));

    act(() => {
      result.current.completeTab('scoping');
    });

    // scoping stays completed, repair is still active, no double-unlock
    expect(result.current.tabStatuses.scoping).toBe('completed');
    expect(result.current.activeTab).toBe('repair');
  });

  it('should navigate to an unlocked tab via goToTab', () => {
    const initial: TabRecord = {
      scoping: 'completed',
      repair: 'active',
      qa: 'locked',
    };

    const { result } = renderHook(() => useTabState(initial));

    act(() => {
      result.current.goToTab('scoping');
    });

    expect(result.current.activeTab).toBe('scoping');
  });

  it('should not navigate to a locked tab via goToTab', () => {
    const { result } = renderHook(() => useTabState());

    act(() => {
      result.current.goToTab('repair');
    });

    expect(result.current.activeTab).toBe('scoping');
  });

  it('should reset all tabs to default state', () => {
    const initial: TabRecord = {
      scoping: 'completed',
      repair: 'completed',
      qa: 'active',
    };

    const { result } = renderHook(() => useTabState(initial));

    act(() => {
      result.current.resetTabs();
    });

    expect(result.current.tabStatuses.scoping).toBe('active');
    expect(result.current.tabStatuses.repair).toBe('locked');
    expect(result.current.tabStatuses.qa).toBe('locked');
    expect(result.current.activeTab).toBe('scoping');
  });

  it('should navigate to a completed tab via goToTab', () => {
    const initial: TabRecord = {
      scoping: 'completed',
      repair: 'completed',
      qa: 'active',
    };

    const { result } = renderHook(() => useTabState(initial));

    act(() => {
      result.current.goToTab('scoping');
    });

    expect(result.current.activeTab).toBe('scoping');
  });

  it('should have an isComplete property that returns true only when all tabs completed', () => {
    const { result } = renderHook(() => useTabState());

    expect(result.current.isComplete).toBe(false);

    act(() => result.current.completeTab('scoping'));
    expect(result.current.isComplete).toBe(false);

    act(() => result.current.completeTab('repair'));
    expect(result.current.isComplete).toBe(false);

    act(() => result.current.completeTab('qa'));
    expect(result.current.isComplete).toBe(true);
  });

  it('should keep an already completed tab completed and not regress', () => {
    const initial: TabRecord = {
      scoping: 'completed',
      repair: 'completed',
      qa: 'active',
    };

    const { result } = renderHook(() => useTabState(initial));

    act(() => {
      result.current.completeTab('qa');
    });

    expect(result.current.tabStatuses.scoping).toBe('completed');
    expect(result.current.tabStatuses.repair).toBe('completed');
    expect(result.current.tabStatuses.qa).toBe('completed');
    expect(result.current.isComplete).toBe(true);
    expect(result.current.activeTab).toBeNull();
  });
});
