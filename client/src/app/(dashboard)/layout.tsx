"use client";

import React from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import AuthGuard from "@/components/auth/AuthGuard";
import AdminAreaGate from "@/components/auth/AdminAreaGate";
import { Spinner } from "@/components/feedback/Spinner";

const DashboardLayout = dynamic(
  () => import("@/components/layouts/DashboardLayout"),
  {
    ssr: false,
    loading: () => <LayoutLoading />,
  }
);

function LayoutLoading() {
  const t = useTranslations("errors");
  return <Spinner fullScreen label={t("loadingUi")} />;
}

export default function AppDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {/* Học sinh (chỉ quyền LEARN_*) vào khu quản trị -> chuyển sang cổng học sinh */}
      <AdminAreaGate>
        <DashboardLayout>{children}</DashboardLayout>
      </AdminAreaGate>
    </AuthGuard>
  );
}
