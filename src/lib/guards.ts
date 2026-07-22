import type { JobConfig, Progress, TabId } from '@/lib/types';
import { TAB_ORDER } from '@/lib/constants';

/**
 * Check if the user can access the Prep page (Phase 2).
 * Requires a valid job config with both equipmentType and severity set.
 */
export function canAccessPrep(config: JobConfig | null | undefined): boolean {
  if (!config) return false;
  return !!config.equipmentType && !!config.severity;
}

/**
 * Check if the user can access the Activity page (Phase 3).
 * Requires that the prep briefing has been completed.
 */
export function canAccessActivity(progress: Progress | null | undefined): boolean {
  if (!progress) return false;
  return progress.prepComplete;
}

/**
 * Check if the user can access the Performance page (completion screen).
 * Requires all three tabs to be completed.
 */
export function canAccessPerformance(progress: Progress | null | undefined): boolean {
  if (!progress) return false;
  return (
    progress.tabStatuses.scoping === 'completed' &&
    progress.tabStatuses.repair === 'completed' &&
    progress.tabStatuses.qa === 'completed'
  );
}

/**
 * Check if a specific tab is unlocked based on the progress of previous tabs.
 * The first tab (scoping) is always unlocked.
 * Each subsequent tab unlocks when the previous tab is completed.
 */
export function isTabUnlocked(tabId: TabId, progress: Progress): boolean {
  if (tabId === 'scoping') return true;

  const tabIndex = TAB_ORDER.indexOf(tabId);
  if (tabIndex <= 0) return true;

  // Check the immediately preceding tab is completed
  const previousTabId = TAB_ORDER[tabIndex - 1];
  return progress.tabStatuses[previousTabId] === 'completed';
}

/**
 * Check if the user can view/access a specific tab.
 * Tabs that are already completed are always accessible.
 * Active tabs are accessible only if they are unlocked.
 * Locked tabs are not accessible.
 */
export function canAccessTab(tabId: TabId, progress: Progress | null | undefined): boolean {
  if (!progress) return false;

  const status = progress.tabStatuses[tabId];

  // Completed tabs are always accessible
  if (status === 'completed') return true;

  // Active tabs are accessible if unlocked
  if (status === 'active') {
    return isTabUnlocked(tabId, progress);
  }

  // Locked tabs are not accessible
  return false;
}
