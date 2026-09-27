"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { QuizCard } from "@/components/quiz-card";
import { Alert, Button, ButtonLink, Card, EmptyState, PageLoading } from "@/components/ui";
import { PROVIDER_LABEL } from "@/lib/constants";
import {
  useQuizStats,
  useQuizzes,
  useResults,
  useSettings,
} from "@/lib/repository";
import { useHydrated } from "@/lib/storage";
import { percent } from "@/lib/utils";
import { ImportQuizDialog } from "./import-quiz-dialog";

export function HomeView() {
  const hydrated = useHydrated();
  const quizzes = useQuizzes();
  const results = useResults();
  const stats = useQuizStats();
  const settings = useSettings();
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Sembunyikan notifikasi sukses setelah beberapa detik
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!hydrated) return <PageLoading />;

  const hasKey = Boolean(settings.apiKeys[settings.provider]);
  const recent = quizzes.slice(0, 4);

  const totalAnswered = results.reduce((a, r) => a + r.userAnswers.length, 0);
  const totalCorrect = results.reduce((a, r) => a + r.score, 0);
  const avg = percent(totalCorrect, totalAnswered);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[32px] bg-primary-container p-6 text-on-primary-container sm:p-10 animate-fade-in">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-primary/15 blur-2xl"
        />
        <div className="relative max-w-xl">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-surface/60 px-3 py-1 text-xs font-medium">
            <Icon name="sparkles" size={14} /> Latihan soal instan dengan AI
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Mau latihan topik apa hari ini?
          </h1>
          <p className="mt-3 text-sm opacity-80 sm:text-base">
            Tulis topiknya, AI buatkan soal pilihan ganda lengkap dengan
            pembahasan. Kerjakan dengan timer, lalu pelajari kesalahanmu.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/create" icon="plus" className="h-12 px-6 text-base">
              Buat Kuis Baru
            </ButtonLink>
            <Button
              variant="outlined"
              icon="upload"
              className="h-12 px-6"
              onClick={() => setImportOpen(true)}
            >
              Import Soal
            </Button>
            {quizzes.length > 0 && (
              <ButtonLink href="/history" variant="outlined" icon="history" className="h-12 px-6">
                Lihat Riwayat
              </ButtonLink>
            )}
          </div>
        </div>
      </section>

      {notice && <Alert tone="success">{notice}</Alert>}

      {!hasKey && (
        <Alert tone="warning">
          API key untuk {PROVIDER_LABEL[settings.provider]} belum diatur.{" "}
          <Link href="/settings" className="font-semibold underline underline-offset-2">
            Atur di Pengaturan
          </Link>{" "}
          agar bisa generate soal.
        </Alert>
      )}

      {/* Statistik */}
      <section aria-label="Statistik" className="grid grid-cols-3 gap-3">
        <Stat label="Kuis dibuat" value={quizzes.length.toString()} />
        <Stat label="Kali dikerjakan" value={results.length.toString()} />
        <Stat label="Rata-rata skor" value={results.length ? `${avg}%` : "-"} />
      </section>

      {/* Kuis terbaru */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Kuis terbaru</h2>
          {quizzes.length > recent.length && (
            <Link href="/history" className="text-sm font-medium text-primary hover:underline">
              Lihat semua
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon="sparkles"
            title="Belum ada kuis"
            description="Buat atau import kuis pertamamu. Semua kuis tersimpan di perangkat ini dan bisa dikerjakan ulang secara offline."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href="/create" icon="plus">
                  Buat Kuis
                </ButtonLink>
                <Button variant="outlined" icon="upload" onClick={() => setImportOpen(true)}>
                  Import Soal
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recent.map((quiz) => {
              const s = stats.get(quiz.id);
              return (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  lastResult={s?.last}
                  attempts={s?.count ?? 0}
                />
              );
            })}
          </div>
        )}
      </section>

      <ImportQuizDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSaved={(quiz) =>
          setNotice(`Kuis "${quiz.title}" (${quiz.totalQuestions} soal) berhasil diimpor.`)
        }
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 text-center sm:p-5">
      <div className="text-2xl font-bold text-primary sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-on-surface-variant sm:text-sm">{label}</div>
    </Card>
  );
}
