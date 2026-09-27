import { STORAGE_KEYS } from "./constants";
import type { ThemeMode } from "./types";

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(mode: ThemeMode) {
  const dark = resolveDark(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

/**
 * Script inline yang dijalankan sebelum paint pertama agar tidak ada
 * "flash" tema yang salah.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.theme,
)})||'"system"');var d=m==="dark"||(m!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
