"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { NotFoundCard } from "@/components/not-found-card";
import { scoreTone } from "@/components/quiz-card";
import { Button, ButtonLink, Card, Chip, PageLoading } from "@/components/ui";
import { startAttempt, useQuiz, useResult } from "@/lib/repository";
import { useHydrated } from "@/lib/storage";
import { cn, formatDate, formatDuration, percent } from "@/lib/utils";

const MESSAGES = {
  success: "Luar biasa. Pemahamanmu sudah kuat.",
  warning: "Lumayan. Review soal yang salah untuk memperdalam.",
  error: "Jangan menyerah. Pelajari pembahasannya lalu coba lagi.",
};

export function ResultView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const id = useSearchParams().get("id");
  const result = useResult(id);
  const quiz = useQuiz(result?.quizId ?? null);

  if (!hydrated) return <PageLoading />;
  if (!result || !quiz) return <NotFoundCard what="Hasil kuis" />;

  const total = quiz.questions.length;
  const pct = percent(result.score, total);
  const tone = scoreTone(pct);
  const unanswered = result.userAnswers.filter((a) => a === null).length;
  const wrong = total - result.score - unanswered;

  const retry = () => {
    startAttempt(quiz);
    router.push(`/quiz?id=${encodeURIComponent(quiz.id)}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="flex flex-col items-center p-8 text-center animate-slide-up">
        {result.autoSubmitted && (
          <Chip tone="warning" icon="clock">
            Waktu habis, jawaban dikumpulkan otomatis
          </Chip>
        )}
        <p className="mt-3 text-sm text-on-surface-variant">{quiz.title}</p>
        <ScoreRing pct={pct} tone={tone} />
        <h1 className="text-2xl font-bold">
          {result.score} dari {total} benar
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">{MESSAGES[tone]}</p>

        <dl className="mt-6 grid w-full grid-cols-3 gap-3">
          <StatBox label="Benar" value={result.score} className="bg-success-container text-on-success-container" />
          <StatBox label="Salah" value={wrong} className="bg-error-container text-on-error-container" />
          <StatBox label="Kosong" value={unanswered} className="bg-surface-container-high text-on-surface-variant" />
        </dl>

        <div className="mt-4 flex w-full flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={16} />
            {formatDuration(result.timeUsed)} dari {quiz.durationMinutes} mnt
          </span>
          <span>{formatDate(result.completedAt)}</span>
        </div>
      </Card>

      {/* Ringkasan per soal */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Ringkasan jawaban</h2>
        <ol className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {quiz.questions.map((q, i) => {
            const ans = result.userAnswers[i];
            const correct = ans === q.correctIndex;
            const empty = ans === null;
            return (
              <li key={i}>
                <Link
                  href={`/review?id=${encodeURIComponent(result.id)}#soal-${i + 1}`}
                  aria-label={`Soal ${i + 1}: ${empty ? "tidak dijawab" : correct ? "benar" : "salah"}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl text-sm font-semibold transition-transform hover:scale-105",
                    empty
                      ? "bg-surface-container-high text-on-surface-variant"
                      : correct
                        ? "bg-success-container text-on-success-container"
                        : "bg-error-container text-on-error-container",
                  )}
                >
                  {i + 1}
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={`/review?id=${encodeURIComponent(result.id)}`} icon="eye" className="h-12 flex-1">
          Review Pembahasan
        </ButtonLink>
        <Button variant="tonal" icon="replay" className="h-12 flex-1" onClick={retry}>
          Kerjakan Ulang
        </Button>
        <ButtonLink href="/" variant="outlined" icon="home" className="h-12 flex-1">
          Beranda
        </ButtonLink>
      </div>
    </div>
  );
}

function StatBox({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={cn("rounded-2xl p-3", className)}>
      <dt className="text-xs opacity-80">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}

function ScoreRing({ pct, tone }: { pct: number; tone: "success" | "warning" | "error" }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = { success: "text-success", warning: "text-amber-500", error: "text-error" }[tone];
  return (
    <div className="relative my-5 h-36 w-36" role="img" aria-label={`Skor ${pct} persen`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-surface-container-high" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className={cn(color, "transition-[stroke-dashoffset] duration-1000 ease-out")}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-bold">{pct}%</span>
      </div>
    </div>
  );
}
