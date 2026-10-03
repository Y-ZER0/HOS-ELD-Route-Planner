import { z } from "zod";

export const tripSchema = z.object({
  currentLocation: z.string().min(2, "Current location required").max(255),
  pickupLocation: z.string().min(2, "Pickup location required").max(255),
  dropOffLocation: z.string().min(2, "Drop-off location required").max(255),
  currentCycleHoursUsed: z
    .number()
    .min(0, "Min 0 hrs")
    .max(70, "Max 70 hrs"),
});

export type TripFormData = z.infer<typeof tripSchema>;

export const DEFAULT_FORM_VALUES: TripFormData = {
  currentLocation: "",
  pickupLocation: "",
  dropOffLocation: "",
  currentCycleHoursUsed: 0,
};
