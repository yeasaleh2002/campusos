import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Fields safe to return to the account owner. Never includes hashes or token versions. */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  studentId: true,
  batch: true,
  phone: true,
  avatarUrl: true,
  isEmailVerified: true,
  createdAt: true,
  department: { select: { id: true, code: true, name: true } },
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

/** Minimal fields needed to authorise a session on each request. */
export const sessionUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  tokenVersion: true,
  isActive: true,
  isEmailVerified: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export type SessionUser = Prisma.UserGetPayload<{ select: typeof sessionUserSelect }>;

/** Fields needed by the login / credential flows (internal use only). */
const credentialSelect = {
  ...sessionUserSelect,
  passwordHash: true,
} satisfies Prisma.UserSelect;

export type CredentialUser = Prisma.UserGetPayload<{ select: typeof credentialSelect }>;

export const userRepository = {
  findPublicById(id: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  },

  findSessionUser(id: string): Promise<SessionUser | null> {
    return prisma.user.findUnique({ where: { id }, select: sessionUserSelect });
  },

  findCredentialsByEmail(email: string): Promise<CredentialUser | null> {
    return prisma.user.findUnique({ where: { email }, select: credentialSelect });
  },

  findCredentialsById(id: string): Promise<CredentialUser | null> {
    return prisma.user.findUnique({ where: { id }, select: credentialSelect });
  },

  /** Resolves a department code (e.g. "CSE") to its id. */
  async findDepartmentIdByCode(code: string): Promise<string | null> {
    const department = await prisma.department.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true },
    });
    return department?.id ?? null;
  },
};
