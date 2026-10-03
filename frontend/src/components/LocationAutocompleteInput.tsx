import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { AUTOCOMPLETE_MIN_CHARS, useAutocomplete } from "@/hooks/useAutocomplete";
import { cn } from "@/lib/cn";

interface Props {
  id?: string;
  value: string;
  placeholder?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
}

export default function LocationAutocompleteInput({
  id,
  value,
  placeholder,
  inputClassName,
  onChange,
  onBlur,
  name,
}: Props) {
  const generatedId = useId();
  const inputId = id ?? `loc-${generatedId}`;
  const listId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { suggestions, isFetching, isActive, isError } = useAutocomplete(value ?? "");

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Reset highlight whenever the suggestion list changes so keyboard
  // navigation never points at a stale index from the previous query.
  useEffect(() => {
    setHighlight(-1);
  }, [suggestions]);

  const visible = open && isActive;
  const trimmed = (value ?? "").trim();
  const showEmpty =
    visible && !isFetching && !isError && trimmed.length >= AUTOCOMPLETE_MIN_CHARS && suggestions.length === 0;
  const showError =
    visible && !isFetching && isError && trimmed.length >= AUTOCOMPLETE_MIN_CHARS;

  const select = (displayName: string) => {
    onChange(displayName);
    setOpen(false);
    setHighlight(-1);
    // keep focus so the user can tab to the next field
    inputRef.current?.focus();
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlight(-1);
          setOpen(true);
        }}
        onFocus={() => {
          // Open for the active query even before results arrive so the
          // user gets a loading indicator instead of a dead input; the
          // previous list stays visible while the next query fetches.
          if (isActive) setOpen(true);
        }}
        onBlur={() => {
          // delayed so a suggestion click registers before close
          setTimeout(() => setOpen(false), 120);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && visible && suggestions.length > 0) {
            e.preventDefault();
            setHighlight((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp" && visible && suggestions.length > 0) {
            e.preventDefault();
            setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" && visible && highlight >= 0 && suggestions[highlight]) {
            e.preventDefault();
            select(suggestions[highlight].displayName);
          } else if (e.key === "Escape") {
            setOpen(false);
            setHighlight(-1);
          }
        }}
        className={inputClassName}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={highlight >= 0 ? `${listId}-opt-${highlight}` : undefined}
        autoComplete="off"
      />
      {isFetching && visible && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
        </span>
      )}
      {visible && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-card shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.displayName}-${i}`}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                select(s.displayName);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "flex cursor-pointer items-start gap-2 px-2.5 py-2 text-[13px] leading-snug",
                i === highlight ? "bg-secondary text-foreground" : "text-foreground/90",
              )}
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-medium" title={s.displayName}>
                  {s.displayName}
                </span>
                <span className="block text-[11px] text-muted-foreground tabular">
                  {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {showEmpty && (
        <p className="absolute inset-x-0 top-full z-50 mt-1 rounded-md border border-border bg-card px-2.5 py-2 text-[12px] text-muted-foreground shadow-lg">
          No matches — press Enter to keep “{trimmed}”.
        </p>
      )}
      {showError && (
        <p className="absolute inset-x-0 top-full z-50 mt-1 rounded-md border border-border bg-card px-2.5 py-2 text-[12px] text-muted-foreground shadow-lg">
          Search unavailable — press Enter to keep “{trimmed}”.
        </p>
      )}
    </div>
  );
}
