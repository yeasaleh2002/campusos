import type { Prisma } from "@/generated/prisma/client";
import { revalidateBuses } from "@/lib/cache-tags";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertBusServiceDays } from "@/server/domain/bus-days";
import type { AuthUser } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import { syncBusRouteKnowledge } from "@/server/services/knowledge-sync.service";
import type { CreateRouteInput, CreateTripInput, UpdateRouteInput, UpdateTripInput } from "@/server/validators/campus.validators";

const adminRouteSelect = {
  id: true,
  code: true,
  name: true,
  stops: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  trips: { select: { id: true, departureTime: true, direction: true, daysOfWeek: true, isActive: true }, orderBy: { departureTime: "asc" } },
} satisfies Prisma.BusRouteSelect;

/** Every bus mutation: refresh the generated KB entry, then the bus + kb caches (revalidateBuses includes kb). */
async function afterRouteChange(routeId: string): Promise<void> {
  await syncBusRouteKnowledge(routeId);
  revalidateBuses(routeId);
}

async function findRoute(id: string) {
  const route = await prisma.busRoute.findFirst({ where: { id, deletedAt: null }, select: { id: true, code: true } });
  if (!route) throw new NotFoundError("Bus route not found.");
  return route;
}

/** All routes (including inactive) for the admin console. */
export function listAdminRoutes() {
  return prisma.busRoute.findMany({ where: { deletedAt: null }, select: adminRouteSelect, orderBy: { code: "asc" } });
}

export async function createRoute(actor: AuthUser, input: CreateRouteInput, request: Request) {
  const taken = await prisma.busRoute.count({ where: { code: input.code } });
  if (taken) throw new ConflictError("A route with this code already exists.");
  const route = await prisma.busRoute.create({ data: { ...input, notes: input.notes ?? null }, select: adminRouteSelect });
  await audit(actor, "bus.route_create", { type: "BusRoute", id: route.id }, { code: route.code }, request);
  await afterRouteChange(route.id);
  return route;
}

export async function updateRoute(actor: AuthUser, id: string, input: UpdateRouteInput, request: Request) {
  await findRoute(id);
  const route = await prisma.busRoute.update({ where: { id }, data: input, select: adminRouteSelect });
  await audit(actor, "bus.route_update", { type: "BusRoute", id }, { fields: Object.keys(input) }, request);
  await afterRouteChange(id);
  return route;
}

/** Soft-deletes a route; its generated KB entry is removed. */
export async function deleteRoute(actor: AuthUser, id: string, request: Request): Promise<void> {
  const route = await findRoute(id);
  await prisma.busRoute.update({ where: { id }, data: { deletedAt: new Date(), isActive: false }, select: { id: true } });
  await audit(actor, "bus.route_delete", { type: "BusRoute", id }, { code: route.code }, request);
  await afterRouteChange(id);
}

export async function createTrip(actor: AuthUser, routeId: string, input: CreateTripInput, request: Request) {
  assertBusServiceDays(input.daysOfWeek);
  await findRoute(routeId);
  const trip = await prisma.busTrip.create({ data: { ...input, routeId } });
  await audit(actor, "bus.trip_create", { type: "BusTrip", id: trip.id }, { routeId, departureTime: trip.departureTime }, request);
  await afterRouteChange(routeId);
  return trip;
}

async function findTrip(id: string) {
  const trip = await prisma.busTrip.findUnique({ where: { id }, select: { id: true, routeId: true, route: { select: { deletedAt: true } } } });
  if (!trip || trip.route.deletedAt) throw new NotFoundError("Bus trip not found.");
  return trip;
}

export async function updateTrip(actor: AuthUser, id: string, input: UpdateTripInput, request: Request) {
  assertBusServiceDays(input.daysOfWeek);
  const { routeId } = await findTrip(id);
  const trip = await prisma.busTrip.update({ where: { id }, data: input });
  await audit(actor, "bus.trip_update", { type: "BusTrip", id }, { fields: Object.keys(input) }, request);
  await afterRouteChange(routeId);
  return trip;
}

export async function deleteTrip(actor: AuthUser, id: string, request: Request): Promise<void> {
  const { routeId } = await findTrip(id);
  await prisma.busTrip.delete({ where: { id } });
  await audit(actor, "bus.trip_delete", { type: "BusTrip", id }, { routeId }, request);
  await afterRouteChange(routeId);
}
