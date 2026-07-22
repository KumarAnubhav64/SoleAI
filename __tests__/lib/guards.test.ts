import { describe, it, expect } from 'vitest';
import {
  canAccessPrep,
  canAccessActivity,
  canAccessTab,
  canAccessPerformance,
  isTabUnlocked,
} from '@/lib/guards';
import type { JobConfig, Progress } from '@/lib/types';
import { createDefaultProgress } from '@/lib/types';

describe('guards', () => {
  describe('canAccessPrep', () => {
    it('should return true when a valid job config exists', () => {
      const config: JobConfig = {
        equipmentType: 'hvac',
        severity: 'routine-maintenance',
      };

      expect(canAccessPrep(config)).toBe(true);
    });

    it('should return false when config is null', () => {
      expect(canAccessPrep(null)).toBe(false);
    });

    it('should return false when config is undefined', () => {
      expect(canAccessPrep(undefined)).toBe(false);
    });

    it('should return false when equipmentType is missing', () => {
      const config = { severity: 'routine-maintenance' } as JobConfig;
      expect(canAccessPrep(config)).toBe(false);
    });

    it('should return false when severity is missing', () => {
      const config = { equipmentType: 'hvac' } as JobConfig;
      expect(canAccessPrep(config)).toBe(false);
    });
  });

  describe('canAccessActivity', () => {
    it('should return true when prep is complete', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        prepComplete: true,
      };

      expect(canAccessActivity(progress)).toBe(true);
    });

    it('should return false when prep is not complete', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        prepComplete: false,
      };

      expect(canAccessActivity(progress)).toBe(false);
    });

    it('should return false when progress is null', () => {
      expect(canAccessActivity(null)).toBe(false);
    });

    it('should return false when progress is undefined', () => {
      expect(canAccessActivity(undefined)).toBe(false);
    });
  });

  describe('canAccessPerformance', () => {
    it('should return true when all tabs are completed', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'completed',
          repair: 'completed',
          qa: 'completed',
        },
      };

      expect(canAccessPerformance(progress)).toBe(true);
    });

    it('should return false when scoping is not completed', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'active',
          repair: 'completed',
          qa: 'completed',
        },
      };

      expect(canAccessPerformance(progress)).toBe(false);
    });

    it('should return false when repair is not completed', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'completed',
          repair: 'locked',
          qa: 'completed',
        },
      };

      expect(canAccessPerformance(progress)).toBe(false);
    });

    it('should return false when qa is not completed', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'completed',
          repair: 'completed',
          qa: 'active',
        },
      };

      expect(canAccessPerformance(progress)).toBe(false);
    });

    it('should return false when progress is null', () => {
      expect(canAccessPerformance(null)).toBe(false);
    });
  });

  describe('isTabUnlocked', () => {
    it('should return true for scoping tab (always unlocked first)', () => {
      const progress = createDefaultProgress();
      expect(isTabUnlocked('scoping', progress)).toBe(true);
    });

    it('should return true for repair tab when scoping is completed', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'completed',
          repair: 'locked',
          qa: 'locked',
        },
      };

      expect(isTabUnlocked('repair', progress)).toBe(true);
    });

    it('should return false for repair tab when scoping is not completed', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'active',
          repair: 'locked',
          qa: 'locked',
        },
      };

      expect(isTabUnlocked('repair', progress)).toBe(false);
    });

    it('should return true for qa tab when repair is completed', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'completed',
          repair: 'completed',
          qa: 'locked',
        },
      };

      expect(isTabUnlocked('qa', progress)).toBe(true);
    });

    it('should return false for qa tab when repair is not completed', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'completed',
          repair: 'active',
          qa: 'locked',
        },
      };

      expect(isTabUnlocked('qa', progress)).toBe(false);
    });
  });

  describe('canAccessTab', () => {
    it('should return true for scoping tab (always accessible first)', () => {
      const progress = createDefaultProgress();
      expect(canAccessTab('scoping', progress)).toBe(true);
    });

    it('should return true for repair tab when scoping is completed', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'completed',
          repair: 'active',
          qa: 'locked',
        },
      };

      expect(canAccessTab('repair', progress)).toBe(true);
    });

    it('should return false for repair tab when it is still locked', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'active',
          repair: 'locked',
          qa: 'locked',
        },
      };

      expect(canAccessTab('repair', progress)).toBe(false);
    });

    it('should allow access to completed tabs', () => {
      const progress: Progress = {
        ...createDefaultProgress(),
        tabStatuses: {
          scoping: 'completed',
          repair: 'completed',
          qa: 'locked',
        },
      };

      // Already completed tabs should be accessible
      expect(canAccessTab('scoping', progress)).toBe(true);
      expect(canAccessTab('repair', progress)).toBe(true);
    });

    it('should return false when progress is null', () => {
      expect(canAccessTab('scoping', null)).toBe(false);
    });
  });
});
