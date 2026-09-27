"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Alert, Button, Card, Chip, IconButton, Spinner } from "@/components/ui";
import { MAX_DURATION, MIN_DURATION } from "@/lib/constants";
import {
  clampDuration,
  ImportError,
  MAX_IMPORT_BYTES,
  parseQuizImport,
  SAMPLE_TEMPLATE,
  type ParsedQuizData,
} from "@/lib/quiz-import";
import { saveImportedQuiz, startAttempt } from "@/lib/repository";
import type { Quiz } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "file" | "text" | "sample";

const TABS: { value: Tab; label: string; icon: IconName }[] = [
  { value: "file", label: "Pilih File", icon: "file" },
  { value: "text", label: "Tempel Teks", icon: "code" },
  { value: "sample", label: "Contoh Format", icon: "info" },
];

const inputClass =
  "w-full rounded-2xl border border-outline bg-surface px-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30";

/**
 * Dialog import soal dari file / teks JSON.
 * Mengikuti ImportQuizSheet pada versi APK: 3 tab (file, tempel teks, contoh
 * format) + kartu pratinjau untuk mengubah judul & durasi sebelum disimpan.
 */
export function ImportQuizDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Dipanggil setelah kuis disimpan tanpa langsung dimulai. */
  onSaved?: (quiz: Quiz) => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("file");
  const [jsonText, setJsonText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuizData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  const titleId = useId();
  const tabIds = useId();
  const textId = useId();
  const quizTitleId = useId();
  const durationId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const reset = () => {
    setTab("file");
    setJsonText("");
    setParsed(null);
    setFileName(null);
    setTitle("");
    setDuration(15);
    setError(null);
    setLoading(false);
    setDragOver(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const applyParsed = (data: ParsedQuizData, fallbackTitle: string) => {
    setParsed(data);
    setTitle(data.title ?? fallbackTitle);
    setDuration(clampDuration(data.durationMinutes));
  };

  const handleError = (err: unknown, prefix: string) => {
    setParsed(null);
    setError(err instanceof ImportError ? err.message : `${prefix}: ${(err as Error)?.message ?? err}`);
  };

  const loadFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setParsed(null);
      setError("Ukuran file terlalu besar (maksimal 2 MB).");
      return;
    }
    setLoading(true);
    try {
      const content = await file.text();
      if (!content.trim()) throw new ImportError("File kosong atau tidak dapat dibaca.");
      const baseName = file.name.replace(/\.[^.]+$/, "");
      applyParsed(parseQuizImport(content, baseName), baseName);
      setFileName(file.name);
    } catch (err) {
      setFileName(null);
      handleError(err, "Gagal membaca file");
    } finally {
      setLoading(false);
    }
  };

  const parseText = (text: string) => {
    setError(null);
    if (!text.trim()) {
      setParsed(null);
      setError("Silakan tempel teks JSON terlebih dahulu.");
      return;
    }
    if (new Blob([text]).size > MAX_IMPORT_BYTES) {
      setParsed(null);
      setError("Teks terlalu besar (maksimal 2 MB).");
      return;
    }
    try {
      setFileName(null);
      applyParsed(parseQuizImport(text), "Kuis Hasil Import");
    } catch (err) {
      handleError(err, "Format JSON salah");
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError("Clipboard kosong. Tidak ada teks yang dapat ditempel.");
        return;
      }
      setJsonText(text);
      parseText(text);
    } catch {
      setError("Browser tidak mengizinkan membaca clipboard. Tempel manual dengan Ctrl/⌘ + V.");
    }
  };

  const copySample = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_TEMPLATE);
      setCopied(true);
    } catch {
      setError("Gagal menyalin. Pilih teks contoh lalu salin manual.");
    }
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const durationValid =
    Number.isInteger(duration) && duration >= MIN_DURATION && duration <= MAX_DURATION;

  const save = (startNow: boolean) => {
    if (!parsed) return;
    const t = title.trim();
    if (!t) {
      setError("Judul kuis tidak boleh kosong.");
      return;
    }
    if (!durationValid) {
      setError(`Durasi harus antara ${MIN_DURATION}-${MAX_DURATION} menit.`);
      return;
    }
    try {
      const quiz = saveImportedQuiz({
        title: t.slice(0, 120),
        description: parsed.description,
        durationMinutes: duration,
        questions: parsed.questions,
      });
      if (startNow) {
        startAttempt(quiz);
        router.push(`/quiz?id=${encodeURIComponent(quiz.id)}`);
      }
      close();
      if (!startNow) onSaved?.(quiz);
    } catch (err) {
      setError((err as Error)?.message ?? "Gagal menyimpan kuis.");
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto max-h-[90vh] w-[min(94vw,640px)] overflow-y-auto rounded-[28px] bg-surface-container-high p-0 text-on-surface shadow-2xl open:animate-slide-up"
    >
      <div className="space-y-4 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
            <Icon name="upload" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold">
              Import Soal Kuis
            </h2>
            <p className="text-xs text-on-surface-variant">
              Impor kuis dari file atau teks berformat JSON
            </p>
          </div>
          <IconButton icon="x" label="Tutup" onClick={close} />
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Sumber import" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-container p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              id={`${tabIds}-${t.value}`}
              role="tab"
              type="button"
              aria-selected={tab === t.value}
              aria-controls={`${tabIds}-panel`}
              onClick={() => {
                setTab(t.value);
                setError(null);
              }}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors sm:text-sm",
                tab === t.value
                  ? "bg-surface text-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-on-surface/5",
              )}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {error && <Alert>{error}</Alert>}

        <div id={`${tabIds}-panel`} role="tabpanel" aria-labelledby={`${tabIds}-${tab}`}>
          {tab === "file" && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.txt,application/json,text/plain"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void loadFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  dragOver
                    ? "border-primary bg-primary/8"
                    : parsed && fileName
                      ? "border-success bg-success-container/40"
                      : "border-outline-variant bg-surface-container hover:border-primary",
                )}
              >
                {loading ? (
                  <span className="text-primary">
                    <Spinner size={32} />
                  </span>
                ) : (
                  <>
                    <span
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-full",
                        parsed && fileName
                          ? "bg-success-container text-on-success-container"
                          : "bg-primary-container text-on-primary-container",
                      )}
                    >
                      <Icon name={parsed && fileName ? "check" : "upload"} size={28} />
                    </span>
                    <span className="mt-3 text-sm font-semibold">
                      {fileName ?? "Klik atau seret file .json ke sini"}
                    </span>
                    <span className="mt-1 text-xs text-on-surface-variant">
                      {parsed && fileName
                        ? `${parsed.questions.length} soal berhasil dimuat`
                        : "Mendukung format JSON kuis atau daftar pertanyaan"}
                    </span>
                  </>
                )}
              </button>
            </>
          )}

          {tab === "text" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor={textId} className="text-xs text-on-surface-variant">
                  Teks JSON:
                </label>
                <Button variant="text" icon="clipboard" className="h-8 px-3 text-xs" onClick={pasteFromClipboard}>
                  Tempel Clipboard
                </Button>
              </div>
              <textarea
                id={textId}
                rows={7}
                value={jsonText}
                spellCheck={false}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="Tempel teks JSON kuis di sini..."
                className={cn(inputClass, "resize-y py-3 font-mono text-xs")}
              />
              <Button icon="check" className="w-full" onClick={() => parseText(jsonText)}>
                Validasi &amp; Ekstrak Soal
              </Button>
            </div>
          )}

          {tab === "sample" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Struktur JSON yang didukung:</span>
                <Button variant="text" icon={copied ? "check" : "copy"} className="h-8 px-3 text-xs" onClick={copySample}>
                  {copied ? "Tersalin" : "Salin Format"}
                </Button>
              </div>
              <pre className="max-h-72 overflow-auto rounded-2xl border border-outline-variant bg-surface-container p-4 font-mono text-[11px] leading-relaxed">
                {SAMPLE_TEMPLATE}
              </pre>
              <p className="text-xs text-on-surface-variant">
                Key alternatif juga didukung, misalnya <code className="font-mono">soal</code>,{" "}
                <code className="font-mono">pilihan</code>, <code className="font-mono">kunci</code> (huruf
                A/B/C, angka, atau teks opsi), dan <code className="font-mono">pembahasan</code>.
              </p>
              <span role="status" aria-live="polite" className="sr-only">
                {copied ? "Contoh JSON disalin ke clipboard" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Pratinjau */}
        {parsed && (
          <Card className="space-y-4 bg-surface animate-fade-in">
            <div className="flex flex-wrap gap-2">
              <Chip tone="success" icon="check">
                {parsed.questions.length} Soal Terdeteksi
              </Chip>
              {parsed.skipped > 0 && (
                <Chip tone="warning" icon="alert">
                  {parsed.skipped} soal dilewati (format tidak valid)
                </Chip>
              )}
            </div>

            <div>
              <label htmlFor={quizTitleId} className="mb-1 block text-xs text-on-surface-variant">
                Judul Kuis
              </label>
              <input
                id={quizTitleId}
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                className={cn(inputClass, "h-11 font-semibold")}
              />
            </div>

            <div>
              <label htmlFor={durationId} className="mb-1 block text-xs text-on-surface-variant">
                Durasi Pengerjaan (Menit)
              </label>
              <input
                id={durationId}
                type="number"
                inputMode="numeric"
                min={MIN_DURATION}
                max={MAX_DURATION}
                value={Number.isNaN(duration) ? "" : duration}
                aria-invalid={!durationValid}
                onChange={(e) => setDuration(e.target.valueAsNumber)}
                className={cn(inputClass, "h-11", !durationValid && "border-error")}
              />
              {!durationValid && (
                <p className="mt-1 text-xs text-error">
                  Isi antara {MIN_DURATION}-{MAX_DURATION} menit.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outlined" onClick={() => save(false)} disabled={!title.trim() || !durationValid}>
                Simpan Kuis
              </Button>
              <Button icon="play" onClick={() => save(true)} disabled={!title.trim() || !durationValid}>
                Simpan &amp; Mulai
              </Button>
            </div>
          </Card>
        )}
      </div>
    </dialog>
  );
}
