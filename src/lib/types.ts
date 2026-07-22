// ─── Phase 1: Job Configuration ───

export type EquipmentType = 'hvac' | 'industrial-printer' | 'server-rack';

export type SeverityLevel = 'routine-maintenance' | 'critical-fault';

export interface JobConfig {
  equipmentType: EquipmentType;
  severity: SeverityLevel;
}

// ─── Phase 2: Permission Status ───

export type PermissionStatus = 'idle' | 'granted' | 'denied' | 'unavailable';

// ─── Phase 3: Tab System ───

export type TabId = 'scoping' | 'repair' | 'qa';

export type TabStatus = 'locked' | 'active' | 'completed';

export type TabRecord = Record<TabId, TabStatus>;

// ─── Chat System ───

export interface ChatMessage {
  id: string;
  sender: 'expert' | 'user';
  text: string;
  timestamp: number;
}

export interface ChatScript {
  messages: ChatMessage[];
  currentStep: number;
}

// ─── Recording ───

export interface RecordingMetadata {
  blobUrl: string | null;
  duration: number;
  timestamp: number;
  mimeType: string;
}

// ─── Progress / State ───

export interface Progress {
  configComplete: boolean;
  prepComplete: boolean;
  tabStatuses: TabRecord;
  currentTab: TabId | null;
}

// ─── Persisted State (localStorage shape) ───

export interface PersistedState {
  jobConfig: JobConfig | null;
  progress: Progress;
  scopingChat: ChatMessage[];
  qaChat: ChatMessage[];
  recording: RecordingMetadata | null;
  scopingStep: number;
  qaStep: number;
}

// ─── Cookie Flags (for middleware) ───

export type CookieFlag = 'true' | '';

export interface CookieFlags {
  configComplete: CookieFlag;
  prepComplete: CookieFlag;
  tab1Complete: CookieFlag;
  tab2Complete: CookieFlag;
  tab3Complete: CookieFlag;
}

// ─── Default factory ───

export function createDefaultProgress(): Progress {
  return {
    configComplete: false,
    prepComplete: false,
    tabStatuses: {
      scoping: 'active',
      repair: 'locked',
      qa: 'locked',
    },
    currentTab: null,
  };
}

export function createDefaultPersistedState(): PersistedState {
  return {
    jobConfig: null,
    progress: createDefaultProgress(),
    scopingChat: [],
    qaChat: [],
    recording: null,
    scopingStep: 0,
    qaStep: 0,
  };
}
