import { create } from "zustand";
import type { LastRequest, PlanResponseData } from "@/lib/types";

const STORAGE_KEY = "spotter:last-trip-v2";

function loadInitial(): PlanResponseData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlanResponseData;
  } catch {
    return null;
  }
}

interface AppState {
  theme: "light" | "dark";
  toggleTheme: () => void;
  activeTrip: PlanResponseData | null;
  setActiveTrip: (data: PlanResponseData | null) => void;
  lastRequest: LastRequest | null;
  setLastRequest: (r: LastRequest | null) => void;
  activeDayIndex: number;
  setActiveDayIndex: (i: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "dark",
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "light" ? "dark" : "light";
      if (next === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      return { theme: next };
    }),
  activeTrip: typeof window !== "undefined" ? loadInitial() : null,
  setActiveTrip: (data) =>
    set(() => {
      try {
        if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return { activeTrip: data, activeDayIndex: 0 };
    }),
  lastRequest: null,
  setLastRequest: (r) => set({ lastRequest: r }),
  activeDayIndex: 0,
  setActiveDayIndex: (i) => set({ activeDayIndex: i }),
}));

// Default to dark (matches UI mock) on first load.
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}
