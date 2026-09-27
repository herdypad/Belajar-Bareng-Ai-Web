"use client";

import { useMemo } from "react";
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants";
import {
  listStorageKeys,
  readStorage,
  removeStorage,
  useStoredValue,
  writeStorage,
} from "./storage";
import type {
  GenerateResponse,
  Quiz,
  QuizAttempt,
  QuizResult,
  Settings,
  ThemeMode,
} from "./types";
import { uid } from "./utils";

// Fallback harus stabil (dipakai sebagai server snapshot).
const EMPTY_QUIZZES: Quiz[] = [];
const EMPTY_RESULTS: QuizResult[] = [];

/* ------------------------------ Quiz ------------------------------ */

export function useQuizzes(): Quiz[] {
  return useStoredValue(STORAGE_KEYS.quizzes, EMPTY_QUIZZES);
}

export function useQuiz(id: string | null): Quiz | undefined {
  const quizzes = useQuizzes();
  return useMemo(() => quizzes.find((q) => q.id === id), [quizzes, id]);
}

export function createQuiz(input: {
  description: string;
  durationMinutes: number;
  provider: Quiz["provider"];
  model: string;
  generated: GenerateResponse;
}): Quiz {
  const quiz: Quiz = {
    id: uid(),
    title: input.generated.title,
    description: input.description,
    totalQuestions: input.generated.questions.length,
    durationMinutes: input.durationMinutes,
    createdAt: Date.now(),
    provider: input.provider,
    model: input.model,
    questions: input.generated.questions,
  };
  const quizzes = readStorage(STORAGE_KEYS.quizzes, EMPTY_QUIZZES);
  writeStorage(STORAGE_KEYS.quizzes, [quiz, ...quizzes]);
  return quiz;
}

export function deleteQuiz(id: string) {
  const quizzes = readStorage(STORAGE_KEYS.quizzes, EMPTY_QUIZZES);
  writeStorage(
    STORAGE_KEYS.quizzes,
    quizzes.filter((q) => q.id !== id),
  );
  const results = readStorage(STORAGE_KEYS.results, EMPTY_RESULTS);
  writeStorage(
    STORAGE_KEYS.results,
    results.filter((r) => r.quizId !== id),
  );
  removeStorage(STORAGE_KEYS.attempt(id));
}

/* ----------------------------- Result ----------------------------- */

export function useResults(): QuizResult[] {
  return useStoredValue(STORAGE_KEYS.results, EMPTY_RESULTS);
}

export function useResult(id: string | null): QuizResult | undefined {
  const results = useResults();
  return useMemo(() => results.find((r) => r.id === id), [results, id]);
}

export interface QuizStats {
  last?: QuizResult;
  count: number;
}

/** Hasil terakhir & jumlah pengerjaan per kuis. */
export function useQuizStats(): Map<string, QuizStats> {
  const results = useResults();
  return useMemo(() => {
    const map = new Map<string, QuizStats>();
    for (const r of results) {
      const s = map.get(r.quizId) ?? { count: 0 };
      s.count += 1;
      if (!s.last || r.completedAt > s.last.completedAt) s.last = r;
      map.set(r.quizId, s);
    }
    return map;
  }, [results]);
}

export function saveResult(
  quiz: Quiz,
  answers: (number | null)[],
  timeUsed: number,
  autoSubmitted: boolean,
): QuizResult {
  const score = quiz.questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );
  const result: QuizResult = {
    id: uid(),
    quizId: quiz.id,
    userAnswers: quiz.questions.map((_, i) => answers[i] ?? null),
    score,
    timeUsed: Math.max(0, Math.min(timeUsed, quiz.durationMinutes * 60)),
    completedAt: Date.now(),
    autoSubmitted,
  };
  const results = readStorage(STORAGE_KEYS.results, EMPTY_RESULTS);
  writeStorage(STORAGE_KEYS.results, [result, ...results]);
  return result;
}

/* ----------------------------- Attempt ---------------------------- */

export function useAttempt(quizId: string | null): QuizAttempt | null {
  return useStoredValue<QuizAttempt | null>(
    quizId ? STORAGE_KEYS.attempt(quizId) : "bba:attempt:none",
    null,
  );
}

export function getAttempt(quizId: string): QuizAttempt | null {
  return readStorage<QuizAttempt | null>(STORAGE_KEYS.attempt(quizId), null);
}

/** Mulai sesi baru (menimpa sesi lama jika ada). */
export function startAttempt(quiz: Quiz): QuizAttempt {
  const attempt: QuizAttempt = {
    quizId: quiz.id,
    startedAt: Date.now(),
    answers: quiz.questions.map(() => null),
    flagged: quiz.questions.map(() => false),
    current: 0,
  };
  writeStorage(STORAGE_KEYS.attempt(quiz.id), attempt);
  return attempt;
}

export function updateAttempt(
  quizId: string,
  patch: (a: QuizAttempt) => QuizAttempt,
) {
  const current = getAttempt(quizId);
  if (!current) return;
  writeStorage(STORAGE_KEYS.attempt(quizId), patch(current));
}

export function clearAttempt(quizId: string) {
  removeStorage(STORAGE_KEYS.attempt(quizId));
}

/* ----------------------------- Settings --------------------------- */

export function useSettings(): Settings {
  const stored = useStoredValue<Settings>(
    STORAGE_KEYS.settings,
    DEFAULT_SETTINGS,
  );
  // Gabungkan dengan default supaya aman jika struktur lama tidak lengkap.
  return useMemo(
    () => ({
      provider: stored.provider ?? DEFAULT_SETTINGS.provider,
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...stored.apiKeys },
      models: { ...DEFAULT_SETTINGS.models, ...stored.models },
    }),
    [stored],
  );
}

export function saveSettings(settings: Settings) {
  writeStorage(STORAGE_KEYS.settings, settings);
}

export function useTheme(): ThemeMode {
  return useStoredValue<ThemeMode>(STORAGE_KEYS.theme, "system");
}

export function saveTheme(mode: ThemeMode) {
  writeStorage(STORAGE_KEYS.theme, mode);
}

/* ----------------------------- Lainnya ---------------------------- */

/** Hapus semua kuis, hasil, dan sesi berjalan. Pengaturan tetap. */
export function clearAllQuizData() {
  removeStorage(STORAGE_KEYS.quizzes);
  removeStorage(STORAGE_KEYS.results);
  listStorageKeys("bba:attempt:").forEach(removeStorage);
}
