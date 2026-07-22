import { useReducer, useCallback } from 'react';
import type { TabId, TabRecord, TabStatus } from '@/lib/types';
import { TAB_ORDER } from '@/lib/constants';

interface TabState {
  tabStatuses: TabRecord;
  activeTab: TabId | null;
  isComplete: boolean;
}

type TabAction =
  { type: 'COMPLETE_TAB'; tabId: TabId } | { type: 'GO_TO_TAB'; tabId: TabId } | { type: 'RESET' };

function createDefaultTabRecord(): TabRecord {
  return {
    scoping: 'active',
    repair: 'locked',
    qa: 'locked',
  };
}

function tabReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case 'COMPLETE_TAB': {
      const { tabId } = action;
      const currentStatus = state.tabStatuses[tabId];

      // Can only complete an active tab
      if (currentStatus !== 'active') return state;

      const tabIndex = TAB_ORDER.indexOf(tabId);
      const newStatuses = { ...state.tabStatuses, [tabId]: 'completed' as TabStatus };

      // Unlock the next tab if it exists
      const nextTabId = TAB_ORDER[tabIndex + 1];
      if (nextTabId) {
        newStatuses[nextTabId] = 'active';
      }

      const allCompleted = TAB_ORDER.every((t) => newStatuses[t] === 'completed');

      return {
        tabStatuses: newStatuses,
        activeTab: allCompleted ? null : (nextTabId ?? null),
        isComplete: allCompleted,
      };
    }

    case 'GO_TO_TAB': {
      const { tabId } = action;
      const status = state.tabStatuses[tabId];

      // Can only navigate to unlocked or completed tabs
      if (status === 'locked') return state;

      return { ...state, activeTab: tabId };
    }

    case 'RESET': {
      return createInitialState();
    }

    default:
      return state;
  }
}

function createInitialState(initialStatuses?: TabRecord): TabState {
  const tabStatuses = initialStatuses ?? createDefaultTabRecord();
  const firstActive = (Object.entries(tabStatuses) as [TabId, TabStatus][]).find(
    ([, status]) => status === 'active',
  );
  const allCompleted = TAB_ORDER.every((t) => tabStatuses[t] === 'completed');

  return {
    tabStatuses,
    activeTab: allCompleted ? null : (firstActive?.[0] ?? 'scoping'),
    isComplete: allCompleted,
  };
}

interface UseTabStateReturn {
  tabStatuses: TabRecord;
  activeTab: TabId | null;
  isComplete: boolean;
  completeTab: (tabId: TabId) => void;
  goToTab: (tabId: TabId) => void;
  resetTabs: () => void;
}

/**
 * A tab lock/unlock state machine hook.
 *
 * Manages the sequential tab flow: scoping → repair → qa.
 * Each tab must be completed before the next one unlocks.
 *
 * @param initialStatuses - Optional initial tab statuses (defaults to scoping active, rest locked)
 */
export function useTabState(initialStatuses?: TabRecord): UseTabStateReturn {
  const [state, dispatch] = useReducer(tabReducer, initialStatuses, (statuses) =>
    createInitialState(statuses),
  );

  const completeTab = useCallback((tabId: TabId) => {
    dispatch({ type: 'COMPLETE_TAB', tabId });
  }, []);

  const goToTab = useCallback((tabId: TabId) => {
    dispatch({ type: 'GO_TO_TAB', tabId });
  }, []);

  const resetTabs = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    tabStatuses: state.tabStatuses,
    activeTab: state.activeTab,
    isComplete: state.isComplete,
    completeTab,
    goToTab,
    resetTabs,
  };
}
