import { AiError, generateQuiz } from "@/lib/ai";
import {
  MAX_DESCRIPTION,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
} from "@/lib/constants";
import type { AiProvider, GenerateRequest } from "@/lib/types";

/**
 * Proxy tipis ke OpenAI / Anthropic.
 * API key dikirim oleh browser per-request dan TIDAK disimpan / di-log di server.
 */

const PROVIDERS: AiProvider[] = ["openai", "anthropic"];
const TIMEOUT_MS = 120_000;

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: Partial<GenerateRequest>;
  try {
    body = await request.json();
  } catch {
    return bad("Body request harus JSON.");
  }

  const provider = body.provider;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const count = Number(body.count);

  if (!provider || !PROVIDERS.includes(provider)) {
    return bad("Provider tidak dikenal.");
  }
  if (!apiKey) return bad("API key belum diisi.");
  if (!model || model.length > 100 || !/^[\w.\-:/]+$/.test(model)) {
    return bad("Nama model tidak valid.");
  }
  if (!description) return bad("Deskripsi soal wajib diisi.");
  if (description.length > MAX_DESCRIPTION) {
    return bad(`Deskripsi maksimal ${MAX_DESCRIPTION} karakter.`);
  }
  if (
    !Number.isInteger(count) ||
    count < MIN_QUESTIONS ||
    count > MAX_QUESTIONS
  ) {
    return bad(`Jumlah soal harus ${MIN_QUESTIONS}-${MAX_QUESTIONS}.`);
  }

  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(TIMEOUT_MS),
  ]);

  try {
    const result = await generateQuiz({
      provider,
      apiKey,
      model,
      description,
      count,
      signal,
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof AiError) return bad(err.message, err.status);
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return bad("Waktu tunggu AI habis. Coba kurangi jumlah soal.", 504);
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return bad("Permintaan dibatalkan.", 499);
    }
    console.error("[generate] unexpected error:", (err as Error)?.message);
    return bad("Gagal menghubungi provider AI. Periksa koneksi internet.", 502);
  }
}
