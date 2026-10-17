"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bot, House, NotebookPen, Swords, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuardedLeave } from "../shared/leaveGuard";

export interface StudentNavItem {
  href: string;
  key: "home" | "chat" | "practice" | "arena" | "achievements";
  icon: LucideIcon;
}

export const STUDENT_NAV: StudentNavItem[] = [
  { href: "/learn", key: "home", icon: House },
  { href: "/learn/chat", key: "chat", icon: Bot },
  { href: "/learn/practice", key: "practice", icon: NotebookPen },
  { href: "/learn/arena", key: "arena", icon: Swords },
  { href: "/learn/achievements", key: "achievements", icon: Trophy },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/learn") return pathname === "/learn";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Link có chặn rời trang khi đang trong trận */
function GuardedLink({ href, className, children, ariaCurrent }: { href: string; className: string; children: React.ReactNode; ariaCurrent?: boolean }) {
  const { navigate } = useGuardedLeave();
  return (
    <Link
      href={href}
      className={className}
      aria-current={ariaCurrent ? "page" : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </Link>
  );
}

/** Menu dọc trên desktop */
export function StudentSidebar({ footer }: { footer?: React.ReactNode }) {
  const t = useTranslations("learn");
  const pathname = usePathname();
  return (
    <nav aria-label={t("nav.label")} className="flex h-full flex-col gap-1 p-3">
      {STUDENT_NAV.map(({ href, key, icon: Icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <GuardedLink
            key={href}
            href={href}
            ariaCurrent={active}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "bg-[var(--c-primary)] text-white shadow-sm" : "text-[var(--c-text-2)] hover:bg-[var(--c-bg-muted)]",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {t(`nav.${key}`)}
          </GuardedLink>
        );
      })}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </nav>
  );
}

/** Thanh điều hướng dưới cùng trên mobile */
export function StudentBottomNav() {
  const t = useTranslations("learn");
  const pathname = usePathname();
  return (
    <nav
      aria-label={t("nav.label")}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-[var(--c-surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {STUDENT_NAV.map(({ href, key, icon: Icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <GuardedLink
            key={href}
            href={href}
            ariaCurrent={active}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              active ? "text-[var(--c-primary)]" : "text-muted-foreground",
            )}
          >
            <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-[var(--c-primary-bg)]")}>
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="max-w-full truncate px-1">{t(`nav.short.${key}`)}</span>
          </GuardedLink>
        );
      })}
    </nav>
  );
}
