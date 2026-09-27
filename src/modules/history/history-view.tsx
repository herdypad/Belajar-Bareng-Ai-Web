"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icon";
import { QuizCard, scoreTone } from "@/components/quiz-card";
import { ButtonLink, Chip, EmptyState, PageHeader, PageLoading } from "@/components/ui";
import {
  deleteQuiz,
  useQuizStats,
  useQuizzes,
  useResults,
} from "@/lib/repository";
import { useHydrated } from "@/lib/storage";
import type { Quiz } from "@/lib/types";
import { cn, formatDate, formatDuration, percent } from "@/lib/utils";

type Tab = "quizzes" | "attempts";

export function HistoryView() {
  const hydrated = useHydrated();
  const quizzes = useQuizzes();
  const results = useResults();
  const stats = useQuizStats();
  const [tab, setTab] = useState<Tab>("quizzes");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Quiz | null>(null);
  const searchId = useId();

  const quizMap = useMemo(() => new Map(quizzes.map((q) => [q.id, q])), [quizzes]);

  const q = query.trim().toLowerCase();
  const filteredQuizzes = useMemo(
    () =>
      q
        ? quizzes.filter(
            (x) => x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q),
          )
        : quizzes,
    [quizzes, q],
  );
  const filteredResults = useMemo(
    () =>
      results
        .filter((r) => quizMap.has(r.quizId))
        .filter((r) => !q || quizMap.get(r.quizId)!.title.toLowerCase().includes(q))
        .sort((a, b) => b.completedAt - a.completedAt),
    [results, quizMap, q],
  );

  if (!hydrated) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Riwayat"
        subtitle="Semua kuis tersimpan di perangkat ini dan bisa diakses offline."
        action={
          <ButtonLink href="/create" icon="plus">
            Kuis Baru
          </ButtonLink>
        }
      />

      {quizzes.length === 0 ? (
        <EmptyState
          icon="history"
          title="Riwayat masih kosong"
          description="Kuis yang kamu buat dan kerjakan akan muncul di sini."
          action={
            <ButtonLink href="/create" icon="plus">
              Buat Kuis
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Jenis riwayat" className="inline-flex self-start rounded-full border border-outline p-1">
              {(
                [
                  ["quizzes", `Kuis (${quizzes.length})`],
                  ["attempts", `Pengerjaan (${filteredResults.length})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  role="tab"
                  type="button"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    tab === value
                      ? "bg-secondary-container text-on-secondary-container"
                      : "text-on-surface-variant hover:bg-on-surface/5",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <label htmlFor={searchId} className="sr-only">
                Cari kuis
              </label>
              <Icon
                name="search"
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari topik..."
                className="h-11 w-full rounded-full bg-surface-container-high pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {tab === "quizzes" ? (
            filteredQuizzes.length === 0 ? (
              <EmptyState icon="search" title="Tidak ada hasil" description={`Tidak ada kuis yang cocok dengan "${query}".`} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredQuizzes.map((quiz) => {
                  const s = stats.get(quiz.id);
                  return (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      lastResult={s?.last}
                      attempts={s?.count ?? 0}
                      onDelete={() => setToDelete(quiz)}
                    />
                  );
                })}
              </div>
            )
          ) : filteredResults.length === 0 ? (
            <EmptyState icon="list" title="Belum ada pengerjaan" description="Kerjakan salah satu kuis untuk melihat skornya di sini." />
          ) : (
            <ul className="divide-y divide-outline-variant/60 overflow-hidden rounded-3xl bg-surface-container-low ring-1 ring-outline-variant/60">
              {filteredResults.map((r) => {
                const quiz = quizMap.get(r.quizId)!;
                const pct = percent(r.score, quiz.questions.length);
                return (
                  <li key={r.id}>
                    <Link
                      href={`/result?id=${encodeURIComponent(r.id)}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-on-surface/5"
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold",
                          {
                            success: "bg-success-container text-on-success-container",
                            warning: "bg-warning-container text-on-warning-container",
                            error: "bg-error-container text-on-error-container",
                          }[scoreTone(pct)],
                        )}
                      >
                        {pct}%
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{quiz.title}</p>
                        <p className="text-xs text-on-surface-variant">
                          {r.score}/{quiz.questions.length} benar · {formatDuration(r.timeUsed)} · {formatDate(r.completedAt)}
                        </p>
                      </div>
                      {r.autoSubmitted && (
                        <span className="hidden sm:inline">
                          <Chip tone="warning" icon="clock">Waktu habis</Chip>
                        </span>
                      )}
                      <Icon name="chevronRight" className="shrink-0 text-on-surface-variant" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus kuis?"
        danger
        confirmLabel="Hapus"
        onConfirm={() => {
          if (toDelete) deleteQuiz(toDelete.id);
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      >
        <p>
          Kuis <strong className="text-on-surface">{toDelete?.title}</strong> beserta seluruh riwayat
          pengerjaannya akan dihapus permanen dari perangkat ini.
        </p>
      </ConfirmDialog>
    </div>
  );
}
