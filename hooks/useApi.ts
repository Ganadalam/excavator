"use client";

import { useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { ApiResponse } from "@/types";

/**
 * Thin wrapper around fetch that:
 *  - Always sends/receives JSON
 *  - Shows toast on error
 *  - Returns typed ApiResponse
 */
export function useApi() {
  const showToast = useAppStore((s) => s.showToast);

  const apiFetch = useCallback(
    async <T = unknown>(
      url: string,
      options?: RequestInit
    ): Promise<ApiResponse<T>> => {
      try {
        const res = await fetch(url, {
          headers: { "Content-Type": "application/json" },
          ...options,
        });
        const json: ApiResponse<T> = await res.json();
        if (!json.ok) showToast(json.error, "err");
        return json;
      } catch {
        const error = "네트워크 오류가 발생했습니다";
        showToast(error, "err");
        return { ok: false, error };
      }
    },
    [showToast]
  );

  return { apiFetch };
}
