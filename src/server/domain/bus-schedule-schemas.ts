import { z } from "zod";

/**
 * Zod schemas for bus input. They live apart from `bus-schedule.ts` on purpose: that module is also used in the
 * browser (next-bus widget, finder), and importing zod there would add ~30 kB of JavaScript to every page that shows it.
 */

export const busStopsSchema = z
  .array(z.object({ name: z.string().trim().min(2).max(80), offsetMinutes: z.number().int().min(0).max(300) }).strict())
  .min(2)
  .max(30)
  .refine((stops) => stops[0]?.offsetMinutes === 0, { message: "The first stop must have offsetMinutes 0." })
  .refine((stops) => stops.every((stop, i) => i === 0 || stop.offsetMinutes > stops[i - 1].offsetMinutes), {
    message: "Stop offsets must strictly increase.",
  });

export const departureTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (24h).");
