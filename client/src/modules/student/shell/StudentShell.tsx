"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Flame, LayoutDashboard, Zap } from "lucide-react";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import ForcePasswordChangeDialog from "@/components/auth/ForcePasswordChangeDialog";
import { StatusPage } from "@/components/common/StatusPage/StatusPage";
import { BrandMark } from "@/components/layouts/BrandMark";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { authService } from "@/modules/auth/services/auth.service";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGuardedLeave } from "../shared/leaveGuard";
import { hasAdminAccess } from "../shared/portalAccess";
import { useMyStats } from "../shared/useLearnQueries";
import { StudentBottomNav, StudentSidebar } from "./StudentNav";
import { StudentUserMenu } from "./StudentUserMenu";

/** Chuỗi ngày + XP trên thanh trên cùng */
function XpChip() {
  const t = useTranslations("learn");
  const { formatNumber } = useNumberFormat();
  const { navigate } = useGuardedLeave();
  const { data } = useMyStats();
  if (!data) return null;
  return (
    <Link
      href="/learn/achievements"
      onClick={(e) => {
        e.preventDefault();
        navigate("/learn/achievements");
      }}
      className="flex items-center gap-2 rounded-full border bg-[var(--c-surface)] px-2.5 py-1 text-xs font-semibold tabular-nums hover:bg-[var(--c-bg-subtle)] sm:text-sm"
      aria-label={t("shell.statsChip", { streak: data.current_streak, xp: data.total_xp })}
    >
      <span className="flex items-center gap-1 text-[var(--c-warning)]">
        <Flame className="size-4" aria-hidden />
        {data.current_streak}
      </span>
      <span className="h-4 w-px bg-[var(--c-border)]" aria-hidden />
      <span className="flex items-center gap-1 text-[var(--c-primary)]">
        <Zap className="size-4" aria-hidden />
        {formatNumber(data.total_xp)} <span className="hidden sm:inline">{t("xpUnit")}</span>
      </span>
    </Link>
  );
}

/** Khung giao diện học sinh: thanh trên (thương hiệu · XP · tài khoản) + menu dọc (desktop) / thanh dưới (mobile) */
export default function StudentShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("learn");
  const te = useTranslations("errors");
  const router = useRouter();
  const branding = useSystemSettings();
  const { can, user } = usePermission();
  const logout = useAuthStore((s) => s.logout);
  const { allowLeave, navigate } = useGuardedLeave();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const canAdmin = hasAdminAccess(user);

  // Tiêu đề tab theo tên ứng dụng đã cấu hình
  useEffect(() => {
    if (branding.name !== APP_CONFIG.name && document.title.includes(APP_CONFIG.name)) {
      document.title = document.title.replace(APP_CONFIG.name, branding.name);
    }
  }, [branding.name]);

  const handleLogout = async () => {
    if (!(await allowLeave())) return;
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) await authService.logout(refreshToken);
    } catch {
      // Bỏ qua lỗi mạng khi đăng xuất
    } finally {
      logout();
      router.push("/login");
    }
  };

  if (!can(PERMISSIONS.LEARN.VIEW)) {
    return (
      <StatusPage
        status="403"
        fullScreen
        title={te("forbidden.title")}
        subTitle={t("shell.noAccess")}
        extra={
          canAdmin ? (
            <Button asChild>
              <Link href="/">{t("shell.adminPortal")}</Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={handleLogout}>
              {t("shell.logout")}
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--c-layout)]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[var(--c-header-border)] bg-[var(--c-header-bg)] px-3 backdrop-blur-md sm:h-16 lg:px-6">
        <Link href="/learn" className="flex min-w-0 items-center gap-2" onClick={(e) => { e.preventDefault(); navigate("/learn"); }}>
          <BrandMark logoUrl={branding.logoUrl} name={branding.name} size={32} />
          <span className="hidden truncate text-base font-semibold text-foreground sm:inline">{branding.name}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {can(PERMISSIONS.LEARN.USE) && <XpChip />}
          <StudentUserMenu
            canAdmin={canAdmin}
            onProfile={() => navigate("/learn/profile")}
            onChangePassword={() => setPasswordOpen(true)}
            onAdmin={() => navigate("/")}
            onLogout={handleLogout}
          />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r bg-[var(--c-surface)] lg:block">
          <StudentSidebar
            footer={
              canAdmin ? (
                <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => navigate("/")}>
                  <LayoutDashboard />
                  {t("shell.adminPortal")}
                </Button>
              ) : undefined
            }
          />
        </aside>
        <main className="min-w-0 flex-1 px-3 pt-4 pb-24 sm:px-4 lg:px-8 lg:pt-6 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <StudentBottomNav />
      <ChangePasswordModal open={passwordOpen} onCancel={() => setPasswordOpen(false)} />
      <ForcePasswordChangeDialog onLogout={handleLogout} />
    </div>
  );
}
