import type { FollowTargetType } from "@/generated/prisma/enums";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/server/middleware/auth";
import type { FollowInput } from "@/server/validators/campus.validators";

async function targetExists(targetType: FollowTargetType, targetId: string): Promise<boolean> {
  switch (targetType) {
    case "DEPARTMENT":
      return (await prisma.department.count({ where: { id: targetId } })) > 0;
    case "COURSE":
      return (await prisma.course.count({ where: { id: targetId } })) > 0;
    case "CLUB":
      return (await prisma.club.count({ where: { id: targetId, deletedAt: null, isActive: true } })) > 0;
  }
}

/** Follows a department, course or club (idempotent). */
export async function follow(user: AuthUser, input: FollowInput): Promise<void> {
  if (!(await targetExists(input.targetType, input.targetId))) throw new NotFoundError("Nothing to follow with that id.");
  await prisma.follow.upsert({
    where: { userId_targetType_targetId: { userId: user.id, targetType: input.targetType, targetId: input.targetId } },
    create: { userId: user.id, ...input },
    update: {},
    select: { id: true },
  });
}

/** Unfollows (idempotent). */
export async function unfollow(user: AuthUser, input: FollowInput): Promise<void> {
  await prisma.follow.deleteMany({ where: { userId: user.id, targetType: input.targetType, targetId: input.targetId } });
}

/** The user's follows, resolved to display names (one query per target type, no N+1). */
export async function listFollows(user: AuthUser) {
  const follows = await prisma.follow.findMany({
    where: { userId: user.id },
    select: { targetType: true, targetId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const ids = (type: FollowTargetType) => follows.filter((f) => f.targetType === type).map((f) => f.targetId);
  const [departments, courses, clubs] = await Promise.all([
    prisma.department.findMany({ where: { id: { in: ids("DEPARTMENT") } }, select: { id: true, code: true, name: true } }),
    prisma.course.findMany({ where: { id: { in: ids("COURSE") } }, select: { id: true, code: true, title: true } }),
    prisma.club.findMany({ where: { id: { in: ids("CLUB") } }, select: { id: true, slug: true, name: true } }),
  ]);
  const names = new Map<string, string>([
    ...departments.map((d) => [d.id, `${d.code} - ${d.name}`] as const),
    ...courses.map((c) => [c.id, `${c.code} ${c.title}`] as const),
    ...clubs.map((c) => [c.id, c.name] as const),
  ]);
  return follows.map((f) => ({ ...f, name: names.get(f.targetId) ?? null }));
}
