export type JudgeKey = 'solennel' | 'satiriste' | 'sportif';

export type GenerationMode = 'demo' | 'gemini';

export type AppModeKey = 'tribunal' | 'mystery' | 'veto' | 'wheel';

export interface PlayerPlea {
  id: string;
  name: string;
  plea: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  proposedBy?: string;
}

export interface VerdictResult {
  caseNumber: string;
  subject: string;
  judgeKey: JudgeKey;
  judgeLabel: string;
  culprit: string;
  reasoning: string;
  forfeit: string;
  compromise?: string;
  source: GenerationMode;
}

export interface DecisionResult {
  caseNumber: string;
  mode: Exclude<AppModeKey, 'tribunal'>;
  modeTitle: string;
  topic: string;
  winner: string;
  chosenNumber?: number;
  pickedBy?: string;
  reasoning: string;
  miniChallenge: string;
  source: GenerationMode;
  allOptions?: Array<{ index: number; label: string; eliminatedBy?: string }>;
}

export interface AlphabetteAppItem {
  id: string;
  name: string;
  tagline: string;
  url: string;
  isNew?: boolean;
  isCurrent?: boolean;
}

export interface BazarSettings {
  theme: 'light' | 'dark';
  mode: GenerationMode;
  modeExplicitlySet?: boolean;
  ttsSpeed: number;
  bigMode: boolean;
  simpleMode: boolean;
  pinned: boolean;
  language: 'FR' | 'EN' | 'ES';
}
