"use client";

import { useEffect } from "react";

/**
 * Daftarkan service worker (hanya production) agar aplikasi tetap bisa dibuka
 * saat offline. Setelah aktif, kirim daftar aset halaman ini untuk di-cache.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Hindari cache basi saat development.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    const cacheCurrentAssets = (sw: ServiceWorker | null) => {
      if (!sw) return;
      const urls = [
        location.pathname,
        ...performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((u) => u.startsWith(location.origin + "/_next/")),
      ];
      sw.postMessage({ type: "CACHE_URLS", urls });
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => cacheCurrentAssets(reg.active))
      .catch((err) => console.warn("Service worker gagal didaftarkan:", err));
  }, []);

  return null;
}
