"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Bot, ChevronRight, NotebookPen, Swords, Target, Trophy, type LucideIcon } from "lucide-react";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { ChallengeList } from "../shared/ChallengeList";
import { LeaderboardList } from "../shared/LeaderboardList";
import { LevelCard } from "../shared/LevelCard";
import { Panel } from "../shared/ui";
import type { ChallengeProgress } from "../shared/types";
import { useLeaderboard, useMyChallenges, useMyStats } from "../shared/useLearnQueries";
import { useDailyCheckIn } from "./useDailyCheckIn";

const QUICK_ACTIONS: { href: string; key: "chat" | "practice" | "arena" | "achievements"; icon: LucideIcon; tone: string }[] = [
  { href: "/learn/chat", key: "chat", icon: Bot, tone: "primary" },
  { href: "/learn/practice", key: "practice", icon: NotebookPen, tone: "success" },
  { href: "/learn/arena", key: "arena", icon: Swords, tone: "error" },
  { href: "/learn/achievements", key: "achievements", icon: Trophy, tone: "warning" },
];

/** Thử thách hằng ngày lên trước, tối đa 4 mục */
function todayChallenges(items: ChallengeProgress[] | undefined): ChallengeProgress[] | undefined {
  if (!items) return undefined;
  const rank = (p: string) => (p === "DAILY" ? 0 : 1);
  return [...items].sort((a, b) => rank(a.period) - rank(b.period)).slice(0, 4);
}

/** Trang chủ học sinh: danh hiệu · lối tắt · thử thách hôm nay · top 5 tuần */
export function HomeView() {
  const t = useTranslations("learn");
  const { can } = usePermission();
  const canUse = can(PERMISSIONS.LEARN.USE);
  const name = useAuthStore((s) => s.user?.full_name || s.user?.username || "");
  useDailyCheckIn(canUse);

  const stats = useMyStats();
  const challenges = useMyChallenges();
  const leaders = useLeaderboard({ scope: "weekly", limit: 5 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t("home.greeting", { name })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.subtitle")}</p>
      </div>

      <LevelCard stats={stats.data} loading={stats.isLoading} error={stats.isError} onRetry={() => stats.refetch()} />

      <nav aria-label={t("home.quickActions")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map(({ href, key, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-24 flex-col justify-between gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--c-primary-border)] hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex size-10 items-center justify-center rounded-xl" style={{ background: `var(--c-${tone}-bg)`, color: `var(--c-${tone})` }}>
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{t(`nav.${key}`)}</span>
                <span className="block truncate text-xs text-muted-foreground">{t(`home.actions.${key}`)}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          title={t("home.challengesTitle")}
          icon={<Target />}
          action={
            <Link href="/learn/achievements" className="flex items-center gap-1 text-xs font-medium text-[var(--c-primary)] hover:underline">
              {t("home.seeAll")}
              <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <ChallengeList
            items={todayChallenges(challenges.data)}
            loading={challenges.isLoading}
            error={challenges.isError}
            onRetry={() => challenges.refetch()}
          />
        </Panel>
        <Panel
          title={t("home.weeklyTop")}
          icon={<Trophy />}
          action={
            <Link href="/learn/achievements" className={cn("flex items-center gap-1 text-xs font-medium text-[var(--c-primary)] hover:underline")}>
              {t("home.seeAll")}
              <ArrowRight className="size-3.5" />
            </Link>
          }
          bodyClassName="p-2"
        >
          <LeaderboardList
            loading={leaders.isLoading}
            error={leaders.isError}
            onRetry={() => leaders.refetch()}
            items={leaders.data?.map((r) => ({
              key: r.user_id,
              rank: r.rank,
              name: r.full_name,
              subtitle: [r.class_name, r.level_title].filter(Boolean).join(" · "),
              value: r.xp,
              valueSuffix: t("xpUnit"),
              isMe: r.is_me,
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}
