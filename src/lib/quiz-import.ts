import { MAX_DURATION, MIN_DURATION } from "./constants";
import type { Question } from "./types";
import { OPTION_LETTERS } from "./utils";

/**
 * Port dari QuizImportService (versi APK).
 * Mendukung format lengkap {title, durationMinutes, questions}, objek dengan
 * key alternatif (soal/data/items/list_soal), maupun array soal langsung.
 */

export class ImportError extends Error {}

export interface ParsedQuizData {
  title?: string;
  description?: string;
  durationMinutes?: number;
  questions: Question[];
  /** Jumlah item soal yang dilewati karena formatnya tidak valid. */
  skipped: number;
}

/** Batas ukuran file/teks agar browser tidak hang saat parsing. */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

type Json = Record<string, unknown>;

function pick(obj: Json, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function asText(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

/** Hilangkan code fence (```json ... ```) dan teks di luar blok JSON. */
function cleanJsonString(raw: string): string {
  let str = raw.trim();
  if (str.startsWith("```")) {
    const nl = str.indexOf("\n");
    if (nl !== -1) str = str.slice(nl + 1);
    if (str.endsWith("```")) str = str.slice(0, -3);
    str = str.trim();
  }

  const startObj = str.indexOf("{");
  const startArr = str.indexOf("[");
  let start = -1;
  let end = -1;
  if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
    start = startObj;
    end = str.lastIndexOf("}");
  } else if (startArr !== -1) {
    start = startArr;
    end = str.lastIndexOf("]");
  }
  return start !== -1 && end > start ? str.slice(start, end + 1) : str;
}

function parseOptions(raw: unknown): string[] {
  let values: unknown[] = [];
  if (Array.isArray(raw)) {
    values = raw;
  } else if (raw && typeof raw === "object") {
    // Contoh: {"A": "Opsi 1", "B": "Opsi 2"}
    const map = raw as Json;
    values = Object.keys(map)
      .sort()
      .map((k) => map[k]);
  }
  return values
    .map(asText)
    .filter((o): o is string => Boolean(o));
}

function parseCorrectIndex(raw: unknown, options: string[]): number {
  let idx = 0;
  if (typeof raw === "number") {
    idx = Math.trunc(raw);
  } else if (typeof raw === "string") {
    const str = raw.trim().toUpperCase();
    if (/^[A-Z]$/.test(str)) {
      // A -> 0, B -> 1, dst.
      idx = str.charCodeAt(0) - 65;
    } else if (/^-?\d+$/.test(str)) {
      idx = Number(str);
    } else {
      // Kunci berupa teks opsi
      const lower = raw.trim().toLowerCase();
      const match = options.findIndex((o) => o.toLowerCase() === lower);
      if (match !== -1) idx = match;
    }
  }
  // Koreksi jika di luar jangkauan opsi (sama seperti APK)
  return idx >= 0 && idx < options.length ? idx : 0;
}

function parseQuestion(raw: unknown): Question | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const map = raw as Json;

  const question = asText(
    pick(map, ["question", "soal", "pertanyaan", "teks", "prompt"]),
  );
  if (!question) return null;

  const options = parseOptions(
    pick(map, ["options", "pilihan", "opsi", "choices", "jawaban_opsi"]),
  );
  // Minimal 2 opsi; maksimal sebanyak label huruf yang tersedia (A-Z).
  if (options.length < 2 || options.length > OPTION_LETTERS.length) return null;

  const correctIndex = parseCorrectIndex(
    pick(map, [
      "correctIndex",
      "correct_index",
      "kunci",
      "jawaban",
      "jawabanBenar",
      "kunciIndex",
      "answer",
    ]),
    options,
  );

  const explanation =
    asText(pick(map, ["explanation", "penjelasan", "pembahasan", "alasan"])) ??
    "";

  return { question, options, correctIndex, explanation };
}

function parseDuration(raw: unknown): number | undefined {
  const n =
    typeof raw === "number"
      ? Math.trunc(raw)
      : typeof raw === "string" && /^\d+$/.test(raw.trim())
        ? Number(raw.trim())
        : undefined;
  return n !== undefined && n > 0 ? n : undefined;
}

/** Parse teks JSON menjadi data kuis. Melempar ImportError jika gagal. */
export function parseQuizImport(
  rawJson: string,
  defaultTitle?: string,
): ParsedQuizData {
  const clean = cleanJsonString(rawJson);
  if (!clean) throw new ImportError("Teks JSON kosong atau tidak valid.");

  let decoded: unknown;
  try {
    decoded = JSON.parse(clean);
  } catch {
    throw new ImportError(
      "Sintaks JSON tidak valid: pastikan tanda kurung dan petik sesuai.",
    );
  }

  let title: string | undefined;
  let description: string | undefined;
  let durationMinutes: number | undefined;
  let rawQuestions: unknown[];

  if (Array.isArray(decoded)) {
    rawQuestions = decoded;
  } else if (decoded && typeof decoded === "object") {
    const obj = decoded as Json;
    title = asText(pick(obj, ["title", "judul", "name"])) || undefined;
    description = asText(pick(obj, ["description", "deskripsi"])) || undefined;
    durationMinutes = parseDuration(
      pick(obj, ["durationMinutes", "duration", "durasi"]),
    );

    const list = pick(obj, ["questions", "soal", "data", "items", "list_soal"]);
    if (!Array.isArray(list)) {
      throw new ImportError(
        'JSON tidak memiliki array "questions" atau "soal".',
      );
    }
    rawQuestions = list;
  } else {
    throw new ImportError("Format data JSON harus berupa objek {} atau list [].");
  }

  if (rawQuestions.length === 0) {
    throw new ImportError("Tidak ditemukan data soal di dalam JSON.");
  }

  const questions = rawQuestions
    .map(parseQuestion)
    .filter((q): q is Question => q !== null);

  if (questions.length === 0) {
    throw new ImportError(
      "Tidak ada soal valid yang berhasil diekstrak (setiap soal butuh pertanyaan, minimal 2 opsi, dan kunci jawaban).",
    );
  }

  return {
    title: title ?? defaultTitle,
    description,
    durationMinutes,
    questions,
    skipped: rawQuestions.length - questions.length,
  };
}

/** Durasi default dari JSON, dibatasi ke rentang yang diizinkan aplikasi. */
export function clampDuration(minutes: number | undefined, fallback = 15): number {
  const n = minutes ?? fallback;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, n));
}

/** Contoh template JSON untuk panduan pengguna. */
export const SAMPLE_TEMPLATE = `{
  "title": "Kuis Pengetahuan Umum",
  "durationMinutes": 15,
  "questions": [
    {
      "question": "Apa ibu kota negara Indonesia?",
      "options": ["Jakarta", "Surabaya", "Bandung", "Medan"],
      "correctIndex": 0,
      "explanation": "Ibu kota Indonesia saat ini adalah Jakarta."
    },
    {
      "question": "Berapakah hasil dari 10 + 25?",
      "options": ["30", "35", "40", "45"],
      "correctIndex": 1,
      "explanation": "10 + 25 = 35"
    }
  ]
}`;
