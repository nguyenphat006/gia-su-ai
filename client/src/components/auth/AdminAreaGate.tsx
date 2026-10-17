"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/feedback/Spinner";
import { isStudentOnly, STUDENT_HOME } from "@/modules/student/shared/portalAccess";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Khu quản trị: tài khoản chỉ là học sinh (không có quyền ngoài LEARN_*) được chuyển sang cổng học sinh `/learn`.
 * Đặt bên trong AuthGuard (user đã nạp sau khi mount).
 */
export function AdminAreaGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations("errors");
  const router = useRouter();
  const studentOnly = useAuthStore((s) => isStudentOnly(s.user));

  useEffect(() => {
    if (studentOnly) router.replace(STUDENT_HOME);
  }, [studentOnly, router]);

  if (studentOnly) return <Spinner fullScreen label={t("loadingUi")} />;
  return <>{children}</>;
}

export default AdminAreaGate;
