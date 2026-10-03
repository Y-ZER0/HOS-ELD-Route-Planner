import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAutocomplete, type LocationSuggestion } from "@/api/client";

export const AUTOCOMPLETE_MIN_CHARS = 3;
export const AUTOCOMPLETE_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useAutocomplete(query: string, limit = 5) {
  const debounced = useDebouncedValue(query.trim(), AUTOCOMPLETE_DEBOUNCE_MS);
  const enabled = debounced.length >= AUTOCOMPLETE_MIN_CHARS;

  const result = useQuery<LocationSuggestion[], Error>({
    queryKey: ["locations", "autocomplete", debounced, limit],
    queryFn: () => fetchAutocomplete(debounced, limit),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    ...result,
    suggestions: enabled ? (result.data ?? []) : [],
    debouncedQuery: debounced,
    isActive: enabled,
  };
}
