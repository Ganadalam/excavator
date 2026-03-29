"use client";

import { create } from "zustand";
import type { Company, Equipment, Work, SafeUser } from "@/types";

interface Toast {
  id: number;
  message: string;
  type: "ok" | "err" | "info";
}

export type FontSize = "normal" | "large" | "xlarge";

interface AppState {
  user: SafeUser | null;
  setUser: (u: SafeUser | null) => void;

  companies:  Company[];
  equipments: Equipment[];
  works:      Work[];
  setCompanies:  (d: Company[])   => void;
  setEquipments: (d: Equipment[]) => void;
  setWorks:      (d: Work[])      => void;

  addCompany:    (c: Company)  => void;
  updateCompany: (c: Company)  => void;
  removeCompany: (id: number)  => void;
  addEquipment:    (e: Equipment) => void;
  updateEquipment: (e: Equipment) => void;
  removeEquipment: (id: number)   => void;
  addWork:    (w: Work)    => void;
  updateWork: (w: Work)    => void;
  removeWork: (id: number) => void;

  toasts:    Toast[];
  toastNext: number;
  showToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: number) => void;

  theme:    "dark" | "light";
  setTheme: (t: "dark" | "light") => void;

  fontSize:    FontSize;
  setFontSize: (s: FontSize) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  companies: [], equipments: [], works: [],
  setCompanies:  (companies)  => set({ companies }),
  setEquipments: (equipments) => set({ equipments }),
  setWorks:      (works)      => set({ works }),

  addCompany:    (c) => set((s) => ({ companies: [...s.companies, c] })),
  updateCompany: (c) => set((s) => ({ companies: s.companies.map((x) => (x.id === c.id ? c : x)) })),
  removeCompany: (id) => set((s) => ({ companies: s.companies.filter((x) => x.id !== id) })),

  addEquipment:    (e) => set((s) => ({ equipments: [...s.equipments, e] })),
  updateEquipment: (e) => set((s) => ({ equipments: s.equipments.map((x) => (x.id === e.id ? e : x)) })),
  removeEquipment: (id) => set((s) => ({ equipments: s.equipments.filter((x) => x.id !== id) })),

  addWork:    (w) => set((s) => ({ works: [w, ...s.works] })),
  updateWork: (w) => set((s) => ({ works: s.works.map((x) => (x.id === w.id ? w : x)) })),
  removeWork: (id) => set((s) => ({ works: s.works.filter((x) => x.id !== id) })),

  toasts: [], toastNext: 0,
  showToast: (message, type = "ok") =>
    set((s) => {
      const id = s.toastNext;
      const toast: Toast = { id, message, type };
      setTimeout(() => s.removeToast(id), 3200);
      return { toasts: [...s.toasts, toast], toastNext: id + 1 };
    }),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  theme: "dark",
  setTheme: (theme) => set({ theme }),

  fontSize: "normal",
  setFontSize: (fontSize) => set({ fontSize }),
}));
