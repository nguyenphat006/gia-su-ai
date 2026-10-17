"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import AuthGuard from "@/components/auth/AuthGuard";
import { Spinner } from "@/components/feedback/Spinner";
// Công thức trong câu trả lời AI / đề ôn tập (KaTeX) — nạp một lần cho cả cổng học sinh
import "katex/dist/katex.min.css";

const StudentShell = dynamic(() => import("@/modules/student/shell/StudentShell"), {
  ssr: false,
  loading: () => <ShellLoading />,
});

function ShellLoading() {
  const t = useTranslations("errors");
  return <Spinner fullScreen label={t("loadingUi")} />;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <StudentShell>{children}</StudentShell>
    </AuthGuard>
  );
}
