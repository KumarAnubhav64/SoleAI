// ─── Timer Durations ───

/** Duration of the pre-deployment briefing countdown in seconds */
export const PREP_COUNTDOWN_SECONDS = 30;

/** Duration of the global workspace timer in seconds */
export const GLOBAL_TIMER_SECONDS = 600;

/** Duration to use in development for faster testing */
export const DEV_COUNTDOWN_SECONDS = 3;

export const DEV_GLOBAL_TIMER_SECONDS = 30;

// ─── Mock Expert Delays ───

/** Minimum artificial delay for mock expert responses in ms */
export const MOCK_EXPERT_DELAY_MIN = 1500;

/** Maximum artificial delay for mock expert responses in ms */
export const MOCK_EXPERT_DELAY_MAX = 3000;

/** Status indicator delay before expert starts "typing" in ms */
export const MOCK_TYPING_DELAY = 500;

// ─── Storage Keys ───

export const STORAGE_KEY_PERSISTED_STATE = 'soleai-persisted-state';

// ─── Cookie Keys ───

export const COOKIE_CONFIG_COMPLETE = 'configComplete';
export const COOKIE_PREP_COMPLETE = 'prepComplete';
export const COOKIE_TAB_1_COMPLETE = 'tab1Complete';
export const COOKIE_TAB_2_COMPLETE = 'tab2Complete';
export const COOKIE_TAB_3_COMPLETE = 'tab3Complete';

// ─── Route Paths ───

export const ROUTE_HOME = '/';
export const ROUTE_PREP = '/prep';
export const ROUTE_ACTIVITY = '/activity';
export const ROUTE_PERFORMANCE = '/performance';

// ─── Tab Order ───

export const TAB_ORDER = ['scoping', 'repair', 'qa'] as const;

// ─── Equipment Options ───

export const EQUIPMENT_TYPES = [
  { value: 'hvac' as const, label: 'HVAC System', icon: 'snowflake' },
  { value: 'industrial-printer' as const, label: 'Industrial Printer', icon: 'printer' },
  { value: 'server-rack' as const, label: 'Server Rack', icon: 'server' },
] as const;

export const SEVERITY_LEVELS = [
  { value: 'routine-maintenance' as const, label: 'Routine Maintenance' },
  { value: 'critical-fault' as const, label: 'Critical Fault' },
] as const;
