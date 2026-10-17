"use client";

import { useMounted } from "@/hooks/useMounted";
import { useAuthStore } from "@/stores/useAuthStore";
import { ADMIN_HOME, STUDENT_HOME, isStudentOnly } from "@/modules/student/shared/portalAccess";

export interface PrimaryAction {
  href: string;
  labelKey: "cta.login" | "cta.goLearn" | "cta.goAdmin";
}

const LOGIN: PrimaryAction = { href: "/login", labelKey: "cta.login" };

/**
 * Nút chính của trang chủ: chưa đăng nhập -> "Đăng nhập"; học sinh -> "Vào học"; giáo viên / quản trị -> "Trang quản trị".
 * Phiên đăng nhập nằm ở localStorage -> chỉ đọc sau khi mount (tránh lệch HTML giữa server và client).
 */
export function usePrimaryAction(): PrimaryAction {
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!mounted || !isAuthenticated || !user) return LOGIN;
  return isStudentOnly(user)
    ? { href: STUDENT_HOME, labelKey: "cta.goLearn" }
    : { href: ADMIN_HOME, labelKey: "cta.goAdmin" };
}
