import { MapPinned } from "lucide-react";

export default function EmptyState({
  title,
  hint,
  className = "",
}: {
  title: string;
  hint: string;
  className?: string;
}) {
  return (
    <section className={`panel flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <MapPinned size={18} />
      </span>
      <p className="mt-3 text-[13px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </section>
  );
}
