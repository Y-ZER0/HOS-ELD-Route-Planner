import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import type { PlanResponseData } from "@/lib/types";
import { useAppStore } from "@/stores/useAppStore";
import type { TripFormData } from "@/schemas/tripSchema";

const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000/api/v1";

export const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export interface PlanPayload {
  currentLocation: string;
  pickupLocation: string;
  dropOffLocation: string;
  currentCycleHoursUsed: number;
}

async function postPlan(payload: PlanPayload): Promise<PlanResponseData> {
  const res = await api.post<{ data: PlanResponseData }>("/trips/plan/", payload);
  return res.data.data;
}

export function usePlanTrip() {
  const setActiveTrip = useAppStore((s) => s.setActiveTrip);
  const setLastRequest = useAppStore((s) => s.setLastRequest);
  return useMutation<PlanResponseData, Error, TripFormData>({
    mutationFn: (form) =>
      postPlan({
        currentLocation: form.currentLocation,
        pickupLocation: form.pickupLocation,
        dropOffLocation: form.dropOffLocation,
        currentCycleHoursUsed: form.currentCycleHoursUsed,
      }),
    onSuccess: (data, variables) => {
      setActiveTrip(data);
      setLastRequest({ ...variables, plannedAt: new Date().toISOString() });
    },
  });
}

export function formatApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (err.response?.status === 422)
      return "Unknown location — try 'City, Country' e.g. 'Chicago, IL' or 'Dubai, UAE'.";
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout"))
      return "Backend timed out — is Django running on :8000?";
    if (err.message?.includes("Network Error") || !err.response)
      return `Cannot reach API at ${BASE} — start the backend first.`;
    return `Request failed (${err.response?.status ?? "?"})`;
  }
  return err instanceof Error ? err.message : "Unknown error";
}
