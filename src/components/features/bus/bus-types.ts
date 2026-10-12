import type { BusStop, TripLike } from "@/server/domain/bus-schedule";

export interface BusTrip extends Omit<TripLike, "direction"> {
  direction: "TO_CAMPUS" | "FROM_CAMPUS";
}

export interface BusRouteData {
  id: string;
  code: string;
  name: string;
  stops: BusStop[];
  notes: string | null;
  trips: BusTrip[];
}

export interface DepartureData {
  tripId?: string;
  direction: "TO_CAMPUS" | "FROM_CAMPUS";
  stop: string;
  time: string;
  at: string;
  dayOffset: number;
  minutesUntil: number;
}

export const DIRECTION_LABEL = { TO_CAMPUS: "To campus", FROM_CAMPUS: "From campus" } as const;
