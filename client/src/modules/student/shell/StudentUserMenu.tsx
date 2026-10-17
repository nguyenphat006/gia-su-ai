"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Check, KeyRound, Languages, LayoutDashboard, LogOut, Monitor, Moon, Sun, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES } from "@/i18n/config";
import { useChangeLocale } from "@/i18n/useChangeLocale";
import { useThemeStore, type ThemeMode } from "@/stores/useThemeStore";
import { useAuthStore } from "@/stores/useAuthStore";

const THEME_OPTIONS: { mode: ThemeMode; label: "themeLight" | "themeDark" | "themeSystem"; Icon: typeof Sun }[] = [
  { mode: "light", label: "themeLight", Icon: Sun },
  { mode: "dark", label: "themeDark", Icon: Moon },
  { mode: "system", label: "themeSystem", Icon: Monitor },
];

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Menu tài khoản: hồ sơ, đổi mật khẩu, ngôn ngữ, giao diện, trang quản trị, đăng xuất */
export function StudentUserMenu({
  canAdmin,
  onProfile,
  onChangePassword,
  onAdmin,
  onLogout,
}: {
  canAdmin: boolean;
  onProfile: () => void;
  onChangePassword: () => void;
  onAdmin: () => void;
  onLogout: () => void;
}) {
  const t = useTranslations("learn");
  const tl = useTranslations("layout");
  const tc = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const { locale, changeLocale } = useChangeLocale();
  const themeMode = useThemeStore((s) => s.mode);
  const resolvedTheme = useThemeStore((s) => s.resolved);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const displayName = user?.full_name || user?.username || tl("account");
  const className = user?.student_profile?.school_class_name;
  const subtitle = className ? t("shell.classLabel", { name: className }) : user?.student_profile ? t("shell.gradeLabel", { grade: user.student_profile.grade }) : user?.role_codes?.[0] ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex items-center gap-2 rounded-full p-0.5 hover:bg-accent sm:rounded-md sm:px-2 sm:py-1" aria-label={tl("account")}>
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-semibold text-white" style={{ background: "var(--c-brand-gradient)" }}>
              {initialsOf(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 flex-col text-left leading-tight md:flex">
            <span className="truncate text-[13px] font-semibold text-foreground">{displayName}</span>
            {subtitle && <span className="truncate text-[11px] text-muted-foreground">{subtitle}</span>}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-semibold">{displayName}</span>
          {subtitle && <span className="truncate text-xs font-normal text-muted-foreground">{subtitle}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onProfile}>
          <User />
          {tl("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onChangePassword}>
          <KeyRound />
          {tl("changePassword")}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {resolvedTheme === "dark" ? <Moon /> : <Sun />}
            {tl("appearance")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {THEME_OPTIONS.map(({ mode, label, Icon }) => (
              <DropdownMenuItem key={mode} onSelect={() => setThemeMode(mode)}>
                <Icon />
                {tl(label)}
                {themeMode === mode && <Check className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages />
            {tc("language.label")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {LOCALES.map((loc) => (
              <DropdownMenuItem key={loc} onSelect={() => changeLocale(loc)}>
                {tc(`language.${loc}`)}
                {locale === loc && <Check className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {canAdmin && (
          <DropdownMenuItem onSelect={onAdmin}>
            <LayoutDashboard />
            {t("shell.adminPortal")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onLogout}>
          <LogOut />
          {tc("actions.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
