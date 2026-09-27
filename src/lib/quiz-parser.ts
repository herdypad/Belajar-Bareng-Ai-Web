import type { GenerateResponse, Question } from "./types";

export class QuizParseError extends Error {}

/** Ambil blok JSON dari teks AI (menangani code fence / teks tambahan). */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* lanjut ke ekstraksi */
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* lanjut */
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      /* gagal */
    }
  }
  throw new QuizParseError("Respons AI bukan JSON yang valid.");
}

/** Hapus prefix seperti "A. ", "b) ", "(C) " dari opsi. */
function cleanOption(text: string): string {
  return text.replace(/^\s*\(?[A-Da-d][.):]\s+/, "").trim();
}

function toQuestion(raw: unknown): Question | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const question = typeof r.question === "string" ? r.question.trim() : "";
  if (!question) return null;

  if (!Array.isArray(r.options) || r.options.length !== 4) return null;
  const options = r.options.map((o) =>
    typeof o === "string" || typeof o === "number" ? cleanOption(String(o)) : "",
  );
  if (options.some((o) => !o)) return null;

  const idx =
    typeof r.correctIndex === "string" ? Number(r.correctIndex) : r.correctIndex;
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx > 3) {
    return null;
  }

  const explanation =
    typeof r.explanation === "string" && r.explanation.trim()
      ? r.explanation.trim()
      : "Tidak ada penjelasan.";

  return { question, options, correctIndex: idx, explanation };
}

/**
 * Parse & validasi teks dari AI. Soal yang formatnya tidak valid dibuang.
 * Melempar QuizParseError jika tidak ada soal valid sama sekali.
 */
export function parseQuizResponse(
  text: string,
  maxCount: number,
  fallbackTitle: string,
): GenerateResponse {
  const data = extractJson(text);
  const obj = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  const rawQuestions = Array.isArray(data)
    ? data
    : Array.isArray(obj.questions)
      ? obj.questions
      : null;

  if (!rawQuestions) {
    throw new QuizParseError("Respons AI tidak memiliki field 'questions'.");
  }

  const questions = rawQuestions
    .map(toQuestion)
    .filter((q): q is Question => q !== null)
    .slice(0, maxCount);

  if (questions.length === 0) {
    throw new QuizParseError("Tidak ada soal valid dalam respons AI.");
  }

  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim().slice(0, 120)
      : fallbackTitle;

  return { title, questions };
}
