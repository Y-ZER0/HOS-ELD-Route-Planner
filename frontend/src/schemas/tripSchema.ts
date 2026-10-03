import { z } from "zod";

export const tripSchema = z.object({
  currentLocation: z.string().min(2, "Current location required").max(255),
  pickupLocation: z.string().min(2, "Pickup location required").max(255),
  dropOffLocation: z.string().min(2, "Drop-off location required").max(255),
  currentCycleHoursUsed: z
    .number({ invalid_type_error: "Violation of HOS rules: cycle hours must be a number 0–70." })
    .min(0, "Violation of HOS rules: cycle hours cannot be negative (0–70 hrs).")
    .max(70, "Violation of HOS rules: cycle hours cannot exceed 70 (0–70 hrs)."),
});

export type TripFormData = z.infer<typeof tripSchema>;

export const DEFAULT_FORM_VALUES: TripFormData = {
  currentLocation: "",
  pickupLocation: "",
  dropOffLocation: "",
  currentCycleHoursUsed: 0,
};
