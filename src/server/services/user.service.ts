import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { passwordChangedEmail } from "@/server/email/templates";
import { type PublicUser, publicUserSelect, userRepository } from "@/server/repositories/user.repository";
import type { SessionSubject } from "@/server/services/auth.service";
import { sendEmailAfterResponse } from "@/server/services/email.service";
import { verifyImageUploads } from "@/server/services/upload.service";
import type { ChangePasswordInput, UpdateProfileInput } from "@/server/validators/auth.validators";

/** Returns the signed-in user's profile (safe fields only). */
export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await userRepository.findPublicById(userId);
  if (!user) throw new NotFoundError("User not found.");
  return user;
}

/** Updates editable profile fields. `null` clears an optional field. */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  if (input.avatarUrl) await verifyImageUploads([input.avatarUrl], "avatarUrl", userId);
  let departmentId: string | null | undefined = undefined;
  if (input.department === null) departmentId = null;
  else if (input.department !== undefined) {
    departmentId = await userRepository.findDepartmentIdByCode(input.department);
    if (!departmentId) throw new ValidationError(undefined, [{ path: "department", message: "Unknown department." }]);
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      studentId: input.studentId,
      batch: input.batch,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      departmentId,
    },
    select: publicUserSelect,
  });
}

/**
 * Changes the password after re-checking the current one. Bumps tokenVersion so
 * every other device is signed out; returns the new claims to re-issue this
 * device's cookie.
 */
export async function changePassword(userId: string, input: ChangePasswordInput): Promise<SessionSubject> {
  const user = await userRepository.findCredentialsById(userId);
  if (!user) throw new NotFoundError("User not found.");
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword), tokenVersion: { increment: 1 } },
    select: { id: true, role: true, tokenVersion: true },
  });
  sendEmailAfterResponse(user, () => passwordChangedEmail({ name: user.name, changedAt: new Date() }), "password-changed");
  return updated;
}
