import { describeOffDays, describeWorkingDays, includesOffDay } from "@/config/campus-calendar";
import { AppError } from "@/lib/errors";

/**
 * Buses never run on a weekly off day (Wednesday, Thursday). Throws `BUS_DAY_NOT_ALLOWED` (422) for a
 * trip that includes one; the database also enforces this with a CHECK constraint on `BusTrip`.
 */
export function assertBusServiceDays(days: readonly number[] | undefined): void {
  if (!days || !includesOffDay(days)) return;
  throw new AppError(422, "BUS_DAY_NOT_ALLOWED", `Buses do not run on ${describeOffDays()} (weekly off days). Choose ${describeWorkingDays()}.`, { field: "daysOfWeek" });
}
