import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flag, MapPin, Navigation, Loader2 } from "lucide-react";
import { DEFAULT_FORM_VALUES, tripSchema, type TripFormData } from "@/schemas/tripSchema";
import { formatApiError, usePlanTrip } from "@/api/client";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/cn";
import LocationAutocompleteInput from "@/components/LocationAutocompleteInput";

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-destructive">{error}</span>}
    </label>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring";

export default function TripForm() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  const lastRequest = useAppStore((s) => s.lastRequest);
  const mutation = usePlanTrip();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: lastRequest ?? DEFAULT_FORM_VALUES,
  });

  const cycle = watch("currentCycleHoursUsed");
  const cycleNum = Number(cycle) || 0;
  const remaining = Math.max(0, 70 - cycleNum);
  const currentLocation = watch("currentLocation");
  const pickupLocation = watch("pickupLocation");
  const dropOffLocation = watch("dropOffLocation");

  // Keep slider + number input in sync-friendly way
  useEffect(() => {
    if (activeTrip && !lastRequest) {
      setValue("currentLocation", activeTrip.trip.currentLocation);
      setValue("pickupLocation", activeTrip.trip.pickupLocation);
      setValue("dropOffLocation", activeTrip.trip.dropOffLocation);
      setValue("currentCycleHoursUsed", activeTrip.trip.startCycleHrsUsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (data: TripFormData) => mutation.mutate(data);

  return (
    <section className="panel no-print p-4">
      <h2 className="text-[13px] font-semibold text-foreground">Trip Details &amp; Driver Status</h2>
      <p className="mb-3 mt-0.5 text-[11px] leading-snug text-muted-foreground">
        Enter the run, then generate compliant ELD logs.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Current Location" icon={<Navigation size={12} />} error={errors.currentLocation?.message}>
          <LocationAutocompleteInput
            value={currentLocation}
            placeholder="Chicago, IL"
            inputClassName={inputCls}
            onChange={(v) => setValue("currentLocation", v, { shouldValidate: true, shouldDirty: true })}
          />
        </Field>
        <Field label="Pickup Location" icon={<MapPin size={12} />} error={errors.pickupLocation?.message}>
          <LocationAutocompleteInput
            value={pickupLocation}
            placeholder="Atlanta, GA"
            inputClassName={inputCls}
            onChange={(v) => setValue("pickupLocation", v, { shouldValidate: true, shouldDirty: true })}
          />
        </Field>
        <Field label="Drop-off Location" icon={<Flag size={12} />} error={errors.dropOffLocation?.message}>
          <LocationAutocompleteInput
            value={dropOffLocation}
            placeholder="Dallas, TX"
            inputClassName={inputCls}
            onChange={(v) => setValue("dropOffLocation", v, { shouldValidate: true, shouldDirty: true })}
          />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded-full border border-muted-foreground/40" />
              Current Cycle Hours Used
            </span>
            <span className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-semibold tabular">
              <input
                type="number"
                min={0}
                max={70}
                step={0.5}
                {...register("currentCycleHoursUsed", { valueAsNumber: true })}
                className="w-10 bg-transparent text-right outline-none"
              />
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={70}
            step={0.5}
            value={cycleNum}
            onChange={(e) => setValue("currentCycleHoursUsed", Number(e.target.value), { shouldValidate: true })}
            className="h-1.5 w-full accent-cyan-400"
            aria-label="Current cycle hours used"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular">
            <span>0 hr</span>
            <span className="font-medium text-foreground">{remaining.toFixed(1)} hr remaining in cycle</span>
            <span>70 hr</span>
          </div>
          {errors.currentCycleHoursUsed?.message && (
            <span className="mt-1 block text-[11px] text-destructive">{errors.currentCycleHoursUsed.message}</span>
          )}
          {/* progress bar */}
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", cycleNum > 60 ? "bg-red-400" : "bg-cyan-400")}
              style={{ width: `${Math.min(100, (cycleNum / 70) * 100)}%` }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-[13px] font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {mutation.isPending ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Planning route…
            </>
          ) : (
            "Generate Compliant Route & Logs"
          )}
        </button>

        {mutation.isError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] leading-snug text-destructive">
            {formatApiError(mutation.error)}
          </p>
        )}
        {activeTrip?.trip.routeFallback && (
          <p className="rounded-md border border-amber-400/30 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
            OSRM unreachable — showing haversine fallback route. Times still follow 55&nbsp;mph planning speed.
          </p>
        )}
      </form>
    </section>
  );
}
