// Modul ini hanya dipakai di server (route handler /api/generate).
import { parseQuizResponse, QuizParseError } from "./quiz-parser";
import type { AiProvider, GenerateResponse } from "./types";

export class AiError extends Error {
  constructor(
    message: string,
    public status: number = 502,
  ) {
    super(message);
  }
}

const SYSTEM_PROMPT = `Kamu adalah pembuat soal ujian profesional.
Tugasmu membuat soal pilihan ganda yang akurat, jelas, dan mendidik.
Balas HANYA dengan satu objek JSON valid, tanpa markdown, tanpa teks lain.`;

function buildUserPrompt(description: string, count: number): string {
  return `Buat tepat ${count} soal pilihan ganda berdasarkan topik/deskripsi berikut:
"""
${description}
"""

Aturan:
- Setiap soal memiliki tepat 4 opsi jawaban dan tepat 1 jawaban benar.
- "correctIndex" adalah indeks (0-3) opsi yang benar. Variasikan posisi jawaban benar.
- Jangan menulis huruf (A., B., dst) di dalam teks opsi.
- "explanation" berisi penjelasan singkat (1-3 kalimat) mengapa jawaban tersebut benar.
- Tingkat kesulitan sesuai deskripsi; jika tidak disebut, campuran mudah-sedang-sulit.
- Gunakan bahasa yang sama dengan deskripsi (default: Bahasa Indonesia).
- "title" adalah judul kuis singkat (maks 60 karakter).

Format JSON:
{
  "title": "Judul kuis",
  "questions": [
    {
      "question": "Teks pertanyaan",
      "options": ["Opsi 1", "Opsi 2", "Opsi 3", "Opsi 4"],
      "correctIndex": 2,
      "explanation": "Penjelasan jawaban benar"
    }
  ]
}`;
}

function describeHttpError(status: number, detail: string): AiError {
  if (status === 401 || status === 403) {
    return new AiError("API key tidak valid atau tidak memiliki akses.", 401);
  }
  if (status === 404) {
    return new AiError(
      "Model tidak ditemukan. Periksa nama model di Pengaturan.",
      400,
    );
  }
  if (status === 429) {
    return new AiError(
      "Batas penggunaan (rate limit/kuota) tercapai. Coba lagi nanti.",
      429,
    );
  }
  if (status === 400) {
    return new AiError(`Permintaan ditolak provider: ${detail}`, 400);
  }
  return new AiError(`Provider AI error (${status}): ${detail}`, 502);
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return String(body?.error?.message ?? body?.message ?? res.statusText);
  } catch {
    return res.statusText;
  }
}

async function callOpenAI(
  apiKey: string,
  model: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
    signal,
  });
  if (!res.ok) throw describeHttpError(res.status, await readErrorDetail(res));
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new AiError("Respons OpenAI kosong.");
  }
  return content;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal,
  });
  if (!res.ok) throw describeHttpError(res.status, await readErrorDetail(res));
  const data = await res.json();
  const text = Array.isArray(data?.content)
    ? data.content
        .filter((b: { type?: string }) => b?.type === "text")
        .map((b: { text?: string }) => b.text ?? "")
        .join("")
    : "";
  if (!text) throw new AiError("Respons Anthropic kosong.");
  return text;
}

/**
 * Generate soal. Jika hasil tidak bisa di-parse, coba sekali lagi
 * (menaikkan tingkat keberhasilan parsing).
 */
export async function generateQuiz(params: {
  provider: AiProvider;
  apiKey: string;
  model: string;
  description: string;
  count: number;
  signal: AbortSignal;
}): Promise<GenerateResponse> {
  const { provider, apiKey, model, description, count, signal } = params;
  const userPrompt = buildUserPrompt(description, count);
  const fallbackTitle =
    description.length > 60 ? `${description.slice(0, 57)}...` : description;

  const call = provider === "openai" ? callOpenAI : callAnthropic;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await call(apiKey, model, userPrompt, signal);
    try {
      return parseQuizResponse(text, count, fallbackTitle);
    } catch (err) {
      if (!(err instanceof QuizParseError)) throw err;
      lastError = err;
    }
  }
  throw new AiError(
    `Gagal membaca format soal dari AI. ${(lastError as Error)?.message ?? ""}`.trim(),
    502,
  );
}
