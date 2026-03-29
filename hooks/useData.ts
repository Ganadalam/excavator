"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useApi } from "./useApi";

/**
 * Called once in the dashboard layout.
 * Fetches companies, equipments, works in parallel and hydrates the store.
 */
export function useInitData() {
  const { apiFetch } = useApi();
  const { setCompanies, setEquipments, setWorks } = useAppStore();

  useEffect(() => {
    (async () => {
      const [co, eq, wk] = await Promise.all([
        apiFetch("/api/companies"),
        apiFetch("/api/equipments"),
        apiFetch("/api/works"),
      ]);
      if (co.ok)  setCompanies((co as { ok: true; data: never[] }).data);
      if (eq.ok)  setEquipments((eq as { ok: true; data: never[] }).data);
      if (wk.ok)  setWorks((wk as { ok: true; data: never[] }).data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
