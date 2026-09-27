"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { Alert, Button, Card, PageHeader, PageLoading, Spinner } from "@/components/ui";
import {
  MAX_DESCRIPTION,
  MAX_DURATION,
  MAX_QUESTIONS,
  MIN_DURATION,
  MIN_QUESTIONS,
  PROVIDER_LABEL,
} from "@/lib/constants";
import { requestGenerate } from "@/lib/generate-client";
import { createQuiz, startAttempt, useSettings } from "@/lib/repository";
import { useHydrated } from "@/lib/storage";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Sejarah kemerdekaan Indonesia tahun 1945, tingkat SMA",
  "Dasar-dasar JavaScript: closure, promise, dan async/await",
  "Biologi sel: organel dan fungsinya, tingkat sulit",
  "TOEFL grammar: tenses dan subject-verb agreement",
];

const COUNT_PRESETS = [5, 10, 20, 30];

export function CreateQuizView() {
  const hydrated = useHydrated();
  const settings = useSettings();
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const descId = useId();
  const countId = useId();
  const durationId = useId();

  // Hitung durasi loading
  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(t);
  }, [loading]);

  // Batalkan request jika halaman ditinggalkan
  useEffect(() => () => abortRef.current?.abort(), []);

  if (!hydrated) return <PageLoading />;

  const provider = settings.provider;
  const apiKey = settings.apiKeys[provider];
  const model = settings.models[provider];

  const countValid = Number.isInteger(count) && count >= MIN_QUESTIONS && count <= MAX_QUESTIONS;
  const durationValid =
    Number.isInteger(duration) && duration >= MIN_DURATION && duration <= MAX_DURATION;
  const descValid = description.trim().length >= 3;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!apiKey) {
      setError(`API key ${PROVIDER_LABEL[provider]} belum diatur. Buka Pengaturan terlebih dahulu.`);
      return;
    }
    if (!descValid || !countValid || !durationValid) {
      setError("Periksa kembali isian form.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setElapsed(0);
    setLoading(true);
    try {
      const generated = await requestGenerate(
        { provider, apiKey, model, description: description.trim(), count },
        controller.signal,
      );
      const quiz = createQuiz({
        description: description.trim(),
        durationMinutes: duration,
        provider,
        model,
        generated,
      });
      startAttempt(quiz);
      router.push(`/quiz?id=${encodeURIComponent(quiz.id)}`);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setError("Generate dibatalkan.");
      } else {
        setError((err as Error)?.message ?? "Terjadi kesalahan.");
      }
      setLoading(false);
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => abortRef.current?.abort();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Buat Kuis Baru"
        subtitle="Deskripsikan topik, tentukan jumlah soal dan waktu pengerjaan."
      />

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Card className="space-y-6 p-6">
          {/* Deskripsi */}
          <div>
            <label htmlFor={descId} className="mb-2 block text-sm font-medium">
              Deskripsi soal / topik <span className="text-error">*</span>
            </label>
            <textarea
              id={descId}
              required
              rows={5}
              maxLength={MAX_DESCRIPTION}
              value={description}
              disabled={loading}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Soal matematika SMP tentang persamaan linear satu variabel, tingkat sedang"
              className="w-full resize-y rounded-2xl border border-outline bg-surface px-4 py-3 text-sm outline-none transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            />
            <div className="mt-1 flex justify-between text-xs text-on-surface-variant">
              <span>Semakin spesifik, semakin relevan soalnya.</span>
              <span>
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={loading}
                  onClick={() => setDescription(ex)}
                  className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs text-on-surface-variant transition-colors hover:border-primary hover:bg-primary/8 hover:text-primary disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Jumlah soal */}
            <div>
              <label htmlFor={countId} className="mb-2 block text-sm font-medium">
                Jumlah soal
              </label>
              <input
                id={countId}
                type="number"
                inputMode="numeric"
                min={MIN_QUESTIONS}
                max={MAX_QUESTIONS}
                value={Number.isNaN(count) ? "" : count}
                disabled={loading}
                aria-invalid={!countValid}
                onChange={(e) => setCount(e.target.valueAsNumber)}
                className={cn(
                  "h-12 w-full rounded-2xl border bg-surface px-4 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30",
                  countValid ? "border-outline focus:border-primary" : "border-error",
                )}
              />
              <div className="mt-2 flex gap-2">
                {COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={loading}
                    onClick={() => setCount(n)}
                    aria-pressed={count === n}
                    className={cn(
                      "h-8 flex-1 rounded-lg text-xs font-medium transition-colors",
                      count === n
                        ? "bg-secondary-container text-on-secondary-container"
                        : "border border-outline-variant text-on-surface-variant hover:bg-on-surface/5",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {!countValid && (
                <p className="mt-1 text-xs text-error">
                  Isi antara {MIN_QUESTIONS}-{MAX_QUESTIONS}.
                </p>
              )}
            </div>

            {/* Durasi */}
            <div>
              <label htmlFor={durationId} className="mb-2 block text-sm font-medium">
                Waktu pengerjaan (menit)
              </label>
              <input
                id={durationId}
                type="number"
                inputMode="numeric"
                min={MIN_DURATION}
                max={MAX_DURATION}
                value={Number.isNaN(duration) ? "" : duration}
                disabled={loading}
                aria-invalid={!durationValid}
                onChange={(e) => setDuration(e.target.valueAsNumber)}
                className={cn(
                  "h-12 w-full rounded-2xl border bg-surface px-4 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30",
                  durationValid ? "border-outline focus:border-primary" : "border-error",
                )}
              />
              <p className="mt-2 text-xs text-on-surface-variant">
                Timer untuk seluruh kuis{countValid && durationValid
                  ? ` (~${Math.round((duration * 60) / count)} detik/soal)`
                  : ""}
                .
              </p>
              {!durationValid && (
                <p className="mt-1 text-xs text-error">
                  Isi antara {MIN_DURATION}-{MAX_DURATION} menit.
                </p>
              )}
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="sparkles" size={14} />
            {PROVIDER_LABEL[provider]} · <code className="font-mono">{model}</code>
          </span>
          <Link href="/settings" className="font-medium text-primary hover:underline">
            Ubah provider
          </Link>
        </div>

        {error && (
          <Alert>
            {error}{" "}
            {!apiKey && (
              <Link href="/settings" className="font-semibold underline">
                Ke Pengaturan
              </Link>
            )}
          </Alert>
        )}

        {loading ? (
          <Card className="flex flex-col items-center gap-3 py-8 text-center animate-fade-in" aria-live="polite">
            <div className="text-primary">
              <Spinner size={36} />
            </div>
            <p className="font-medium">AI sedang menyusun {count} soal...</p>
            <p className="text-sm text-on-surface-variant">{elapsed} detik</p>
            <Button variant="text" icon="x" onClick={cancel}>
              Batalkan
            </Button>
          </Card>
        ) : (
          <Button
            type="submit"
            icon="sparkles"
            className="h-14 w-full text-base"
            disabled={!descValid || !countValid || !durationValid}
          >
            Generate Soal
          </Button>
        )}
      </form>
    </div>
  );
}
