"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icon";
import { NotFoundCard } from "@/components/not-found-card";
import { Button, Card, PageLoading } from "@/components/ui";
import {
  clearAttempt,
  getAttempt,
  saveResult,
  startAttempt,
  updateAttempt,
  useAttempt,
  useQuiz,
} from "@/lib/repository";
import { useHydrated } from "@/lib/storage";
import type { Quiz, QuizAttempt } from "@/lib/types";
import { cn, formatClock, OPTION_LETTERS } from "@/lib/utils";

export function QuizRunnerView() {
  const hydrated = useHydrated();
  const id = useSearchParams().get("id");
  const quiz = useQuiz(id);
  const attempt = useAttempt(id);

  if (!hydrated) return <PageLoading />;
  if (!quiz) return <NotFoundCard what="Kuis" />;
  return <Runner quiz={quiz} attempt={attempt} />;
}

function isAttemptValid(quiz: Quiz, a: QuizAttempt | null): a is QuizAttempt {
  return (
    !!a &&
    a.answers.length === quiz.questions.length &&
    a.flagged.length === quiz.questions.length
  );
}

function Runner({ quiz, attempt }: { quiz: Quiz; attempt: QuizAttempt | null }) {
  const router = useRouter();
  const submittedRef = useRef(false);
  const [now, setNow] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<null | "submit" | "exit">(null);

  const valid = isAttemptValid(quiz, attempt);
  const durationMs = quiz.durationMinutes * 60_000;
  const deadline = valid ? attempt.startedAt + durationMs : null;

  // Pastikan ada sesi pengerjaan (mis. saat halaman dibuka langsung).
  useEffect(() => {
    if (submittedRef.current) return;
    if (!isAttemptValid(quiz, getAttempt(quiz.id))) startAttempt(quiz);
  }, [quiz, attempt]);

  const submit = useCallback(
    (auto: boolean) => {
      if (submittedRef.current) return;
      const a = getAttempt(quiz.id);
      if (!isAttemptValid(quiz, a)) return;
      submittedRef.current = true;
      const end = Math.min(Date.now(), a.startedAt + quiz.durationMinutes * 60_000);
      const timeUsed = Math.round((end - a.startedAt) / 1000);
      const result = saveResult(quiz, a.answers, timeUsed, auto);
      router.replace(`/result?id=${encodeURIComponent(result.id)}`);
      clearAttempt(quiz.id);
    },
    [quiz, router],
  );

  // Timer global + auto-submit saat waktu habis
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) submit(true);
    };
    const first = setTimeout(tick, 0);
    const iv = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [deadline, submit]);

  const total = quiz.questions.length;
  const current = valid ? Math.min(attempt.current, total - 1) : 0;

  const goTo = useCallback(
    (index: number) => {
      updateAttempt(quiz.id, (a) => ({
        ...a,
        current: Math.max(0, Math.min(total - 1, index)),
      }));
    },
    [quiz.id, total],
  );

  const choose = useCallback(
    (optionIndex: number) => {
      updateAttempt(quiz.id, (a) => {
        const answers = [...a.answers];
        answers[a.current] = optionIndex;
        return { ...a, answers };
      });
    },
    [quiz.id],
  );

  const toggleFlag = useCallback(() => {
    updateAttempt(quiz.id, (a) => {
      const flagged = [...a.flagged];
      flagged[a.current] = !flagged[a.current];
      return { ...a, flagged };
    });
  }, [quiz.id]);

  // Pintasan keyboard: 1-4 / A-D pilih jawaban, ←/→ navigasi, F tandai
  useEffect(() => {
    if (confirm) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
      if (key in map) {
        e.preventDefault();
        choose(map[key]);
      } else if (e.key === "ArrowRight") {
        goTo(current + 1);
      } else if (e.key === "ArrowLeft") {
        goTo(current - 1);
      } else if (key === "f") {
        toggleFlag();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, choose, goTo, toggleFlag, current]);

  if (!valid) return <PageLoading />;

  const question = quiz.questions[current];
  const selected = attempt.answers[current];
  const answeredCount = attempt.answers.filter((a) => a !== null).length;
  const unanswered = total - answeredCount;
  const flaggedCount = attempt.flagged.filter(Boolean).length;
  const remainingSec =
    now === null ? durationMs / 1000 : Math.max(0, (attempt.startedAt + durationMs - now) / 1000);
  const lowTime = remainingSec <= 60;
  const timePct = (remainingSec / (durationMs / 1000)) * 100;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <Card className="sticky top-[4.5rem] z-20 p-4 shadow-sm backdrop-blur-md sm:p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirm("exit")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/8"
            aria-label="Keluar dari kuis"
          >
            <Icon name="x" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold sm:text-base">{quiz.title}</h1>
            <p className="text-xs text-on-surface-variant">
              {answeredCount}/{total} dijawab
              {flaggedCount > 0 && ` · ${flaggedCount} ditandai`}
            </p>
          </div>
          <div
            role="timer"
            aria-live={lowTime ? "assertive" : "off"}
            aria-label={`Sisa waktu ${formatClock(remainingSec)}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-2 font-mono text-sm font-semibold tabular-nums transition-colors sm:text-base",
              lowTime
                ? "animate-pulse bg-error-container text-on-error-container"
                : "bg-primary-container text-on-primary-container",
            )}
          >
            <Icon name="clock" size={16} />
            {formatClock(remainingSec)}
          </div>
          <Button className="max-sm:hidden" icon="check" onClick={() => setConfirm("submit")}>
            Kumpulkan
          </Button>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container-high"
          aria-hidden
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              lowTime ? "bg-error" : "bg-primary",
            )}
            style={{ width: `${timePct}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Soal */}
        <section aria-labelledby="question-title">
          <Card key={current} className="p-6 animate-slide-up sm:p-8">
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-primary">
                Soal {current + 1} dari {total}
              </span>
              <button
                type="button"
                onClick={toggleFlag}
                aria-pressed={attempt.flagged[current]}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  attempt.flagged[current]
                    ? "bg-warning-container text-on-warning-container"
                    : "border border-outline-variant text-on-surface-variant hover:bg-on-surface/5",
                )}
              >
                <Icon name="flag" size={14} />
                {attempt.flagged[current] ? "Ditandai" : "Tandai"}
              </button>
            </div>

            <h2 id="question-title" className="whitespace-pre-line text-lg font-medium leading-relaxed sm:text-xl">
              {question.question}
            </h2>

            <div role="radiogroup" aria-labelledby="question-title" className="mt-6 space-y-3">
              {question.options.map((opt, i) => {
                const checked = selected === i;
                return (
                  <label
                    key={i}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-all duration-150",
                      "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface",
                      checked
                        ? "border-primary bg-primary-container text-on-primary-container"
                        : "border-outline-variant hover:border-outline hover:bg-on-surface/4",
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${current}`}
                      className="sr-only"
                      checked={checked}
                      onChange={() => choose(i)}
                    />
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                        checked ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant",
                      )}
                    >
                      {OPTION_LETTERS[i]}
                    </span>
                    <span className="pt-1 text-sm leading-relaxed sm:text-base">{opt}</span>
                  </label>
                );
              })}
            </div>
          </Card>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="outlined" icon="chevronLeft" disabled={current === 0} onClick={() => goTo(current - 1)}>
              Sebelumnya
            </Button>
            {current < total - 1 ? (
              <Button variant="tonal" onClick={() => goTo(current + 1)}>
                Selanjutnya
                <Icon name="chevronRight" size={18} />
              </Button>
            ) : (
              <Button icon="check" onClick={() => setConfirm("submit")}>
                Selesai
              </Button>
            )}
          </div>
          <p className="mt-3 hidden text-center text-xs text-on-surface-variant sm:block">
            Pintasan: 1–4 / A–D pilih jawaban · ← → pindah soal · F tandai
          </p>
        </section>

        {/* Navigator */}
        <aside aria-label="Navigasi soal">
          <Card className="p-5 lg:sticky lg:top-44">
            <h2 className="mb-3 text-sm font-semibold">Daftar soal</h2>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-5">
              {quiz.questions.map((_, i) => {
                const answered = attempt.answers[i] !== null;
                const flagged = attempt.flagged[i];
                const isCurrent = i === current;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Soal ${i + 1}${answered ? ", sudah dijawab" : ", belum dijawab"}${flagged ? ", ditandai" : ""}`}
                    className={cn(
                      "relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition-all",
                      answered
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container",
                      isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low",
                    )}
                  >
                    {i + 1}
                    {flagged && (
                      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-surface-container-low" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-on-surface-variant">
              <Legend className="bg-primary" label="Sudah dijawab" />
              <Legend className="bg-surface-container-high" label="Belum dijawab" />
              <Legend className="bg-amber-500" label="Ditandai" round />
            </div>
            <Button className="mt-5 w-full" icon="check" onClick={() => setConfirm("submit")}>
              Kumpulkan
            </Button>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === "submit"}
        title="Kumpulkan jawaban?"
        confirmLabel="Kumpulkan"
        onConfirm={() => {
          setConfirm(null);
          submit(false);
        }}
        onCancel={() => setConfirm(null)}
      >
        {unanswered > 0 ? (
          <p>
            Masih ada <strong className="text-on-surface">{unanswered} soal</strong> yang belum dijawab.
            {flaggedCount > 0 && ` ${flaggedCount} soal ditandai.`} Soal kosong dihitung salah.
          </p>
        ) : (
          <p>Semua soal sudah dijawab. Sisa waktu {formatClock(remainingSec)}.</p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "exit"}
        title="Keluar dari kuis?"
        confirmLabel="Keluar"
        cancelLabel="Lanjut mengerjakan"
        onConfirm={() => {
          setConfirm(null);
          router.push("/");
        }}
        onCancel={() => setConfirm(null)}
      >
        <p>
          Jawabanmu tersimpan dan bisa dilanjutkan dari Riwayat, tetapi{" "}
          <strong className="text-on-surface">timer tetap berjalan</strong>. Jika waktu habis, kuis
          otomatis dikumpulkan saat kamu membukanya lagi.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function Legend({ className, label, round }: { className: string; label: string; round?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-3 w-3", round ? "rounded-full" : "rounded", className)} />
      {label}
    </div>
  );
}
