import type { GenerateRequest, GenerateResponse } from "./types";

export async function requestGenerate(
  payload: GenerateRequest,
  signal?: AbortSignal,
): Promise<GenerateResponse> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error(
      "Kamu sedang offline. Generate soal membutuhkan koneksi internet.",
    );
  }

  let res: Response;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Gagal generate soal (HTTP ${res.status}).`);
  }
  if (!data || !Array.isArray(data.questions)) {
    throw new Error("Respons server tidak valid.");
  }
  return data as GenerateResponse;
}
