"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useTheme } from "@/lib/repository";
import { applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/create", label: "Buat Kuis", icon: "plus" },
  { href: "/history", label: "Riwayat", icon: "history" },
  { href: "/settings", label: "Pengaturan", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Terapkan tema dari localStorage dan ikuti perubahan tema sistem. */
function ThemeSync() {
  const mode = useTheme();
  useEffect(() => {
    applyTheme(mode);
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Saat mengerjakan kuis, sembunyikan navigasi agar fokus & tidak keluar tak sengaja.
  const focusMode = pathname === "/quiz";

  return (
    <>
      <ThemeSync />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
      >
        Lewati ke konten
      </a>

      <header className="sticky top-0 z-30 border-b border-outline-variant/50 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-full font-semibold tracking-tight"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary">
              <Icon name="sparkles" size={18} />
            </span>
            <span className="text-base sm:text-lg">Belajar Bareng AI</span>
          </Link>

          {!focusMode && (
            <nav aria-label="Navigasi utama" className="hidden md:block">
              <ul className="flex items-center gap-1">
                {NAV.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-secondary-container text-on-secondary-container"
                            : "text-on-surface-variant hover:bg-on-surface/8",
                        )}
                      >
                        <Icon name={item.icon} size={18} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </header>

      <main
        id="main"
        className={cn(
          "mx-auto w-full max-w-5xl flex-1 px-4 pt-6",
          focusMode ? "pb-10" : "pb-28 md:pb-12",
        )}
      >
        {children}
      </main>

      {!focusMode && (
        <nav
          aria-label="Navigasi bawah"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant/50 bg-surface-container/95 backdrop-blur-md md:hidden"
        >
          <ul className="mx-auto grid h-20 max-w-md grid-cols-4">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="flex h-full flex-col items-center justify-center gap-1 text-xs font-medium"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-16 items-center justify-center rounded-full transition-colors duration-200",
                        active
                          ? "bg-secondary-container text-on-secondary-container"
                          : "text-on-surface-variant",
                      )}
                    >
                      <Icon name={item.icon} />
                    </span>
                    <span
                      className={
                        active ? "text-on-surface" : "text-on-surface-variant"
                      }
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
