import type { TripFormData } from "@/schemas/tripSchema";

/** Backend contract shapes (logic.txt §7 + BUILD_PLAN_IMPROVED §7). */

export type DutyStatus = "OFF_DUTY" | "SLEEPER" | "DRIVING" | "ON_DUTY";

export interface LogSegment {
  status: DutyStatus;
  start_time_minutes?: number;
  end_time_minutes?: number;
  startMinutes?: number;
  endMinutes?: number;
  duration_minutes?: number;
  durationMinutes?: number;
  remark_location?: string;
  location?: string;
}

export interface EldLog {
  date: string;
  totalMilesDriven: number;
  offDutyHours: number;
  sleeperBerthHours: number;
  drivingHours: number;
  onDutyHours: number;
  remarks: LogSegment[];
  segments: LogSegment[];
}

export interface TripStop {
  stopSequence: number;
  stopType: string; // lower-case from API ("fuel", "rest_10hr", ...) + stop_type upper
  stop_type?: string;
  locationName: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  arrivalTime: string;
  planned_arrival?: string;
  durationMinutes: number;
}

export interface PlanResponseData {
  driver: {
    name: string;
    carrierName: string;
    homeTerminal: string;
    mainOffice: string;
    tractorNumber: string;
    tractor_number?: string;
    trailer_number?: string;
    bolNumber: string;
    cdlNumber: string;
  };
  trip: {
    id: string;
    currentLocation: string;
    pickupLocation: string;
    dropOffLocation: string;
    startCycleHrsUsed: number;
    totalDistanceMiles: number;
    totalDrivingHours: number;
    totalOnDutyHours: number;
    totaRestHours?: number;
    totalRestHours: number;
    totalTripDurationHours: number;
    RemainingCycleHours?: number;
    remainingCycleHours: number;
    cycleWarning?: boolean;
    encodedPolyline: string;
    routeFallback?: boolean;
    logs: EldLog[];
    stops: TripStop[];
  };
  createdAt: string;
}

export function getSegStart(s: LogSegment): number {
  return s.start_time_minutes ?? s.startMinutes ?? 0;
}
export function getSegEnd(s: LogSegment): number {
  return s.end_time_minutes ?? s.endMinutes ?? 0;
}
export function getSegDurationMin(s: LogSegment): number {
  if (typeof s.duration_minutes === "number") return s.duration_minutes;
  if (typeof s.durationMinutes === "number") return s.durationMinutes;
  return getSegEnd(s) - getSegStart(s);
}
export function getSegLocation(s: LogSegment): string {
  return s.remark_location ?? s.location ?? "";
}
export function stopName(s: TripStop): string {
  return s.locationName ?? s.location_name ?? "";
}
export function stopTypeUpper(s: TripStop): string {
  return (s.stop_type ?? s.stopType ?? "").toUpperCase();
}
export function stopArrival(s: TripStop): string {
  return s.arrivalTime ?? s.planned_arrival ?? "";
}
export function stopDuration(s: TripStop): number {
  return s.durationMinutes ?? 0;
}

export interface LastRequest extends TripFormData {
  plannedAt: string;
}
