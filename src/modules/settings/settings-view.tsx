"use client";

import { useId, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon, type IconName } from "@/components/icon";
import { Alert, Button, Card, PageHeader, PageLoading } from "@/components/ui";
import { DEFAULT_MODELS, MODEL_SUGGESTIONS, PROVIDER_LABEL } from "@/lib/constants";
import {
  clearAllQuizData,
  saveSettings,
  saveTheme,
  useQuizzes,
  useSettings,
  useTheme,
} from "@/lib/repository";
import { useHydrated } from "@/lib/storage";
import type { AiProvider, Settings, ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROVIDERS: AiProvider[] = ["openai", "anthropic"];

const KEY_HINT: Record<AiProvider, { placeholder: string; url: string }> = {
  openai: { placeholder: "sk-...", url: "https://platform.openai.com/api-keys" },
  anthropic: { placeholder: "sk-ant-...", url: "https://console.anthropic.com/settings/keys" },
};

const THEMES: { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: "light", label: "Terang", icon: "sun" },
  { value: "dark", label: "Gelap", icon: "moon" },
  { value: "system", label: "Sistem", icon: "monitor" },
];

export function SettingsView() {
  const hydrated = useHydrated();
  const settings = useSettings();
  if (!hydrated) return <PageLoading />;
  return <SettingsForm initial={settings} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const theme = useTheme();
  const quizzes = useQuizzes();
  const [draft, setDraft] = useState<Settings>(initial);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const keyId = useId();
  const modelId = useId();
  const listId = useId();

  const p = draft.provider;

  const update = (fn: (s: Settings) => Settings) => {
    setSaved(false);
    setDraft(fn);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const next: Settings = {
      provider: draft.provider,
      apiKeys: {
        openai: draft.apiKeys.openai.trim(),
        anthropic: draft.apiKeys.anthropic.trim(),
      },
      models: {
        openai: draft.models.openai.trim() || DEFAULT_MODELS.openai,
        anthropic: draft.models.anthropic.trim() || DEFAULT_MODELS.anthropic,
      },
    };
    try {
      saveSettings(next);
      setDraft(next);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Pengaturan" subtitle="Atur provider AI dan tampilan aplikasi." />

      <form onSubmit={onSubmit}>
        <Card className="space-y-6 p-6">
          <h2 className="text-base font-semibold">Provider AI</h2>

          {/* Pilih provider (segmented button) */}
          <div role="radiogroup" aria-label="Provider AI" className="grid grid-cols-2 overflow-hidden rounded-full border border-outline">
            {PROVIDERS.map((prov) => {
              const active = p === prov;
              return (
                <button
                  key={prov}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update((s) => ({ ...s, provider: prov }))}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 text-sm font-medium transition-colors",
                    "not-first:border-l not-first:border-outline",
                    active
                      ? "bg-secondary-container text-on-secondary-container"
                      : "text-on-surface hover:bg-on-surface/5",
                  )}
                >
                  {active && <Icon name="check" size={16} />}
                  {PROVIDER_LABEL[prov]}
                </button>
              );
            })}
          </div>

          {/* API key */}
          <div>
            <label htmlFor={keyId} className="mb-2 block text-sm font-medium">
              API Key {PROVIDER_LABEL[p]}
            </label>
            <div className="relative">
              <input
                id={keyId}
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={draft.apiKeys[p]}
                onChange={(e) => {
                  const v = e.target.value;
                  update((s) => ({ ...s, apiKeys: { ...s.apiKeys, [p]: v } }));
                }}
                placeholder={KEY_HINT[p].placeholder}
                className="h-12 w-full rounded-2xl border border-outline bg-surface pl-4 pr-12 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Sembunyikan API key" : "Tampilkan API key"}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/8"
              >
                <Icon name={showKey ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">
              Dapatkan key di{" "}
              <a href={KEY_HINT[p].url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                {new URL(KEY_HINT[p].url).hostname}
              </a>
              . Key hanya disimpan di browser ini dan dikirim ke provider saat generate soal.
            </p>
          </div>

          {/* Model */}
          <div>
            <label htmlFor={modelId} className="mb-2 block text-sm font-medium">
              Model <span className="font-normal text-on-surface-variant">(opsional)</span>
            </label>
            <input
              id={modelId}
              list={listId}
              spellCheck={false}
              value={draft.models[p]}
              onChange={(e) => {
                const v = e.target.value;
                update((s) => ({ ...s, models: { ...s.models, [p]: v } }));
              }}
              placeholder={DEFAULT_MODELS[p]}
              className="h-12 w-full rounded-2xl border border-outline bg-surface px-4 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <datalist id={listId}>
              {MODEL_SUGGESTIONS[p].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <div className="mt-2 flex flex-wrap gap-2">
              {MODEL_SUGGESTIONS[p].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update((s) => ({ ...s, models: { ...s.models, [p]: m } }))}
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-mono text-xs transition-colors",
                    draft.models[p] === m
                      ? "bg-secondary-container text-on-secondary-container"
                      : "border border-outline-variant text-on-surface-variant hover:bg-on-surface/5",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {error && <Alert>{error}</Alert>}
          {saved && <Alert tone="success">Pengaturan tersimpan.</Alert>}

          <Button type="submit" icon="check" className="w-full sm:w-auto">
            Simpan Pengaturan
          </Button>
        </Card>
      </form>

      {/* Tema */}
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold">Tema</h2>
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => saveTheme(t.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition-all",
                  active
                    ? "border-primary bg-primary-container text-on-primary-container"
                    : "border-outline-variant text-on-surface-variant hover:border-outline",
                )}
              >
                <Icon name={t.icon} size={22} />
                {t.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Data */}
      <Card className="p-6">
        <h2 className="text-base font-semibold">Data lokal</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {quizzes.length} kuis tersimpan di browser ini. Menghapus data browser (cache/cookies situs) juga
          akan menghapus kuis.
        </p>
        <Button
          variant="outlined"
          icon="trash"
          className="mt-4 border-error text-error hover:bg-error/8"
          disabled={quizzes.length === 0}
          onClick={() => setConfirmClear(true)}
        >
          Hapus semua kuis & riwayat
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        title="Hapus semua data?"
        danger
        confirmLabel="Hapus semua"
        onConfirm={() => {
          clearAllQuizData();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      >
        <p>Seluruh kuis, hasil, dan sesi pengerjaan akan dihapus permanen. Pengaturan & API key tetap disimpan.</p>
      </ConfirmDialog>
    </div>
  );
}
