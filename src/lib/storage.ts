"use client";

import { useSyncExternalStore } from "react";

/**
 * Store kecil berbasis localStorage yang kompatibel dengan useSyncExternalStore.
 * Nilai hasil parse di-cache per key sehingga snapshot tetap stabil selama
 * string mentahnya tidak berubah.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    // Sinkron antar tab
    if (e.key === null || e.key.startsWith("bba:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value: T = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

export function writeStorage<T>(key: string, value: T) {
  const raw = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, raw);
  } catch (err) {
    // Biasanya QuotaExceededError
    throw new Error(
      "Penyimpanan lokal penuh. Hapus beberapa kuis lama di Riwayat lalu coba lagi.",
      { cause: err },
    );
  }
  cache.set(key, { raw, value });
  emit();
}

export function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* abaikan */
  }
  cache.delete(key);
  emit();
}

export function listStorageKeys(prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  return keys;
}

/**
 * Hook untuk membaca nilai dari localStorage secara reaktif.
 * `fallback` HARUS referensi stabil (konstanta modul) agar tidak terjadi loop render.
 */
export function useStoredValue<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => readStorage(key, fallback),
    () => fallback,
  );
}

const noopSubscribe = () => () => {};

/** true setelah komponen ter-hydrate di browser (data localStorage siap dibaca). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
