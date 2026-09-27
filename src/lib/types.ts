export type AiProvider = "openai" | "anthropic";

export interface Question {
  question: string;
  options: string[]; // hasil AI selalu 4 opsi; hasil import minimal 2
  correctIndex: number; // index ke options
  explanation: string; // bisa kosong untuk soal hasil import
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  durationMinutes: number;
  createdAt: number; // epoch ms
  provider: AiProvider | "import"; // "import" = diimpor dari JSON
  model: string;
  questions: Question[];
}

export interface QuizResult {
  id: string;
  quizId: string;
  userAnswers: (number | null)[]; // null = tidak dijawab
  score: number; // jumlah benar
  timeUsed: number; // detik
  completedAt: number; // epoch ms
  autoSubmitted: boolean;
}

/** Sesi pengerjaan yang sedang berjalan (agar timer tidak reset saat refresh). */
export interface QuizAttempt {
  quizId: string;
  startedAt: number; // epoch ms
  answers: (number | null)[];
  flagged: boolean[];
  current: number;
}

export type ThemeMode = "light" | "dark" | "system";

export interface Settings {
  provider: AiProvider;
  apiKeys: Record<AiProvider, string>;
  models: Record<AiProvider, string>;
}

/** Payload request ke /api/generate */
export interface GenerateRequest {
  provider: AiProvider;
  apiKey: string;
  model: string;
  description: string;
  count: number;
}

export interface GenerateResponse {
  title: string;
  questions: Question[];
}
