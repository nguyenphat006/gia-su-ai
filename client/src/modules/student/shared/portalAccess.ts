/** Hàm thuần: ai vào cổng học sinh, ai vào trang quản trị. */
import type { UserProfile } from "@/modules/auth/types";

export const STUDENT_HOME = "/learn";
export const ADMIN_HOME = "/admin";
const LEARN_PREFIX = "LEARN_";

type UserLike = Pick<UserProfile, "is_superuser" | "role_codes" | "permissions" | "roles"> | null | undefined;

function roleCodes(user: NonNullable<UserLike>): string[] {
  if (user.role_codes?.length) return user.role_codes;
  return user.roles?.map((r) => r.role_code) ?? [];
}

function isSuper(user: NonNullable<UserLike>): boolean {
  return Boolean(user.is_superuser || roleCodes(user).includes("ADMIN") || user.permissions?.includes("*"));
}

/** Có quyền nào ngoài nhóm LEARN_* (hoặc là quản trị tối cao) -> dùng được trang quản trị */
export function hasAdminAccess(user: UserLike): boolean {
  if (!user) return false;
  if (isSuper(user)) return true;
  return (user.permissions ?? []).some((p) => !p.startsWith(LEARN_PREFIX));
}

/** Chỉ mang vai trò STUDENT và không có quyền quản trị -> chỉ dùng cổng học sinh */
export function isStudentOnly(user: UserLike): boolean {
  if (!user || isSuper(user)) return false;
  const codes = roleCodes(user);
  return codes.length > 0 && codes.every((c) => c === "STUDENT") && !hasAdminAccess(user);
}

/** Trang đích sau khi đăng nhập */
export function homePathFor(user: UserLike): string {
  return isStudentOnly(user) ? STUDENT_HOME : ADMIN_HOME;
}
