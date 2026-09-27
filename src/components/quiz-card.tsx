"use client";

import { useRouter } from "next/navigation";
import { startAttempt, useAttempt } from "@/lib/repository";
import type { Quiz, QuizResult } from "@/lib/types";
import { cn, formatDate, percent } from "@/lib/utils";
import { Button, ButtonLink, Chip, IconButton } from "./ui";

export function scoreTone(pct: number): "success" | "warning" | "error" {
  if (pct >= 80) return "success";
  if (pct >= 50) return "warning";
  return "error";
}

export function QuizCard({
  quiz,
  lastResult,
  attempts,
  onDelete,
}: {
  quiz: Quiz;
  lastResult?: QuizResult;
  attempts: number;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const pct = lastResult ? percent(lastResult.score, quiz.totalQuestions) : null;

  const inProgress = useAttempt(quiz.id);
  const href = `/quiz?id=${encodeURIComponent(quiz.id)}`;

  const play = () => {
    startAttempt(quiz);
    router.push(href);
  };

  return (
    <article className="group rounded-3xl bg-surface-container-low p-5 ring-1 ring-outline-variant/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/40 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{quiz.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
            {quiz.description}
          </p>
        </div>
        {pct !== null && (
          <div
            className={cn(
              "shrink-0 rounded-2xl px-3 py-1.5 text-center",
              {
                success: "bg-success-container text-on-success-container",
                warning: "bg-warning-container text-on-warning-container",
                error: "bg-error-container text-on-error-container",
              }[scoreTone(pct)],
            )}
          >
            <div className="text-lg font-bold leading-none">{pct}%</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide opacity-80">
              Terakhir
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip icon="list">{quiz.totalQuestions} soal</Chip>
        <Chip icon="clock">{quiz.durationMinutes} menit</Chip>
        <Chip>{formatDate(quiz.createdAt)}</Chip>
        {inProgress && (
          <Chip tone="primary" icon="clock">
            Sedang dikerjakan
          </Chip>
        )}
        {attempts > 0 ? (
          <Chip tone="primary">{attempts}x dikerjakan</Chip>
        ) : (
          <Chip tone="warning">Belum dikerjakan</Chip>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {inProgress ? (
          <>
            <ButtonLink icon="play" href={href}>
              Lanjutkan
            </ButtonLink>
            <Button variant="outlined" icon="replay" onClick={play}>
              Ulang dari awal
            </Button>
          </>
        ) : (
          <Button icon={attempts > 0 ? "replay" : "play"} onClick={play}>
            {attempts > 0 ? "Kerjakan Ulang" : "Mulai"}
          </Button>
        )}
        {lastResult && (
          <ButtonLink
            variant="tonal"
            icon="eye"
            href={`/review?id=${encodeURIComponent(lastResult.id)}`}
          >
            Review
          </ButtonLink>
        )}
        {onDelete && (
          <IconButton
            icon="trash"
            label={`Hapus kuis ${quiz.title}`}
            onClick={onDelete}
            className="ml-auto hover:text-error"
          />
        )}
      </div>
    </article>
  );
}
