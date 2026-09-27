import type { AiProvider, Settings } from "./types";

export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 50;
export const MIN_DURATION = 1;
export const MAX_DURATION = 180;
export const MAX_DESCRIPTION = 2000;

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
};

export const MODEL_SUGGESTIONS: Record<AiProvider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
  anthropic: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-1"],
};

export const DEFAULT_SETTINGS: Settings = {
  provider: "openai",
  apiKeys: { openai: "", anthropic: "" },
  models: { ...DEFAULT_MODELS },
};

export const STORAGE_KEYS = {
  quizzes: "bba:quizzes",
  results: "bba:results",
  settings: "bba:settings",
  theme: "bba:theme",
  attempt: (quizId: string) => `bba:attempt:${quizId}`,
} as const;
