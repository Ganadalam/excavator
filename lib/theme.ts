"use client";

export type Theme    = "dark" | "light";
export type FontSize = "normal" | "large" | "xlarge";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return (localStorage.getItem("exmgmt_theme") as Theme) ?? "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  localStorage.setItem("exmgmt_theme", theme);
}

export function getFontSize(): FontSize {
  if (typeof document === "undefined") return "normal";
  return (localStorage.getItem("exmgmt_font") as FontSize) ?? "normal";
}

export function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  root.classList.remove("font-normal", "font-large", "font-xlarge");
  root.classList.add(`font-${size}`);
  localStorage.setItem("exmgmt_font", size);
}
