"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { NotFoundCard } from "@/components/not-found-card";
import { ButtonLink, Card, Chip, EmptyState, PageHeader, PageLoading } from "@/components/ui";
import { useQuiz, useResult } from "@/lib/repository";
import { useHydrated } from "@/lib/storage";
import type { Question } from "@/lib/types";
import { cn, OPTION_LETTERS, percent } from "@/lib/utils";

type Filter = "all" | "wrong" | "correct";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "wrong", label: "Salah / Kosong" },
  { value: "correct", label: "Benar" },
];

export function ReviewView() {
  const hydrated = useHydrated();
  const id = useSearchParams().get("id");
  const result = useResult(id);
  const quiz = useQuiz(result?.quizId ?? null);
  const [filter, setFilter] = useState<Filter>("all");

  // Scroll ke #soal-N setelah konten dirender
  useEffect(() => {
    if (!hydrated || !quiz) return;
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hydrated, quiz]);

  if (!hydrated) return <PageLoading />;
  if (!result || !quiz) return <NotFoundCard what="Hasil kuis" />;

  const items = quiz.questions
    .map((q, i) => ({ q, i, answer: result.userAnswers[i] ?? null }))
    .filter(({ q, answer }) => {
      if (filter === "all") return true;
      const correct = answer === q.correctIndex;
      return filter === "correct" ? correct : !correct;
    });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Review Soal"
        subtitle={`${quiz.title} · Skor ${result.score}/${quiz.questions.length} (${percent(result.score, quiz.questions.length)}%)`}
        action={
          <ButtonLink href={`/result?id=${encodeURIComponent(result.id)}`} variant="text" icon="arrowLeft">
            Hasil
          </ButtonLink>
        }
      />

      <div role="tablist" aria-label="Filter soal" className="mb-5 inline-flex rounded-full border border-outline p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            type="button"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.value
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-on-surface/5",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={filter === "wrong" ? "check" : "alert"}
          title={filter === "wrong" ? "Tidak ada jawaban salah" : "Tidak ada jawaban benar"}
          description={filter === "wrong" ? "Semua soal dijawab dengan benar. Mantap." : "Coba pelajari pembahasan lalu kerjakan ulang."}
        />
      ) : (
        <ol className="space-y-4">
          {items.map(({ q, i, answer }) => (
            <li key={i} id={`soal-${i + 1}`} className="scroll-mt-24">
              <ReviewCard q={q} index={i} answer={answer} />
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 flex justify-center">
        <ButtonLink href="/history" variant="outlined" icon="history">
          Ke Riwayat
        </ButtonLink>
      </div>
    </div>
  );
}

function ReviewCard({ q, index, answer }: { q: Question; index: number; answer: number | null }) {
  const correct = answer === q.correctIndex;
  const empty = answer === null;

  return (
    <Card
      className={cn(
        "border-l-4 p-5 sm:p-6 animate-slide-up",
        correct ? "border-l-success" : "border-l-error",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-on-surface-variant">Soal {index + 1}</span>
        {correct ? (
          <Chip tone="success" icon="check">Benar</Chip>
        ) : empty ? (
          <Chip tone="error" icon="alert">Tidak dijawab</Chip>
        ) : (
          <Chip tone="error" icon="x">Salah</Chip>
        )}
      </div>

      <h2 className="whitespace-pre-line font-medium leading-relaxed">{q.question}</h2>

      <ul className="mt-4 space-y-2">
        {q.options.map((opt, oi) => {
          const isCorrect = oi === q.correctIndex;
          const isPicked = oi === answer;
          return (
            <li
              key={oi}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-3 text-sm",
                isCorrect
                  ? "border-success bg-success-container text-on-success-container"
                  : isPicked
                    ? "border-error bg-error-container text-on-error-container"
                    : "border-outline-variant text-on-surface-variant",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isCorrect
                    ? "bg-success text-white dark:text-black"
                    : isPicked
                      ? "bg-error text-white dark:text-black"
                      : "bg-surface-container-high",
                )}
              >
                {isCorrect ? <Icon name="check" size={14} /> : isPicked ? <Icon name="x" size={14} /> : OPTION_LETTERS[oi]}
              </span>
              <span className="flex-1 pt-0.5">{opt}</span>
              {isPicked && (
                <span className="shrink-0 pt-0.5 text-xs font-semibold">Jawabanmu</span>
              )}
              {isCorrect && !isPicked && (
                <span className="shrink-0 pt-0.5 text-xs font-semibold">Jawaban benar</span>
              )}
            </li>
          );
        })}
      </ul>

      {q.explanation.trim() && (
        <div className="mt-4 rounded-2xl bg-surface-container p-4 text-sm">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-primary">
            <Icon name="sparkles" size={16} /> Pembahasan
          </p>
          <p className="whitespace-pre-line leading-relaxed text-on-surface-variant">{q.explanation}</p>
        </div>
      )}
    </Card>
  );
}
