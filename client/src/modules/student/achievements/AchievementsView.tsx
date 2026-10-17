"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Coins, Flame, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { ChallengeList } from "../shared/ChallengeList";
import { LeaderboardList } from "../shared/LeaderboardList";
import { LevelCard } from "../shared/LevelCard";
import { useMyGrade } from "../shared/SetupFields";
import { Panel, StatTile } from "../shared/ui";
import { GRADES, type ChallengeProgress, type LeaderboardScope } from "../shared/types";
import { useLeaderboard, useMyChallenges, useMyStats } from "../shared/useLearnQueries";

const SCOPES: LeaderboardScope[] = ["weekly", "month", "all"];
const ALL_GRADES = "all";
const PERIOD_ORDER = ["DAILY", "WEEKLY", "ONCE"];

function groupByPeriod(items: ChallengeProgress[]): [string, ChallengeProgress[]][] {
  const map = new Map<string, ChallengeProgress[]>();
  for (const c of items) map.set(c.period, [...(map.get(c.period) ?? []), c]);
  return [...map.entries()].sort((a, b) => PERIOD_ORDER.indexOf(a[0]) - PERIOD_ORDER.indexOf(b[0]));
}

/** Thành tích: danh hiệu · số liệu · thử thách theo kỳ · bảng xếp hạng (tuần / tháng / tất cả, lọc khối) */
export function AchievementsView() {
  const t = useTranslations("learnAchievements");
  const tl = useTranslations("learn");
  const { formatNumber } = useNumberFormat();
  const myGrade = useMyGrade();
  const [scope, setScope] = useState<LeaderboardScope>("weekly");
  const [grade, setGrade] = useState<string>(myGrade ? String(myGrade) : ALL_GRADES);

  const stats = useMyStats();
  const challenges = useMyChallenges();
  const leaders = useLeaderboard({ scope, grade: grade === ALL_GRADES ? null : Number(grade), limit: 50 });
  const s = stats.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <LevelCard stats={s} loading={stats.isLoading} error={stats.isError} onRetry={() => stats.refetch()} />

      {stats.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label={t("stats.weeklyXp")} value={formatNumber(s.weekly_xp)} icon={<TrendingUp />} tone="primary" />
          <StatTile label={t("stats.points")} value={formatNumber(s.points)} icon={<Coins />} tone="warning" />
          <StatTile label={t("stats.currentStreak")} value={tl("streakDays", { count: s.current_streak })} icon={<Flame />} tone="error" />
          <StatTile label={t("stats.longestStreak")} value={tl("streakDays", { count: s.longest_streak })} icon={<CalendarDays />} tone="success" />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("challengesTitle")} icon={<Target />}>
          {challenges.data && challenges.data.length > 0 ? (
            <div className="space-y-4">
              {groupByPeriod(challenges.data).map(([period, items]) => (
                <div key={period} className="space-y-2">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">{tl(`challenges.period.${period === "DAILY" ? "daily" : period === "WEEKLY" ? "weekly" : "once"}`)}</h3>
                  <ChallengeList items={items} />
                </div>
              ))}
            </div>
          ) : (
            <ChallengeList items={challenges.data} loading={challenges.isLoading} error={challenges.isError} onRetry={() => challenges.refetch()} />
          )}
        </Panel>

        <Panel
          title={t("leaderboardTitle")}
          icon={<Trophy />}
          bodyClassName="space-y-3 p-3"
          action={
            <Select value={grade} onValueChange={(v) => v && setGrade(v)}>
              <SelectTrigger size="sm" className="w-32" aria-label={tl("setup.grade")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL_GRADES}>{t("allGrades")}</SelectItem>
                {GRADES.map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    {tl("setup.gradeOption", { grade: g })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <Tabs value={scope} onValueChange={(v) => setScope(v as LeaderboardScope)}>
            <TabsList className="w-full">
              {SCOPES.map((sc) => (
                <TabsTrigger key={sc} value={sc}>
                  {t(`scope.${sc}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <LeaderboardList
            rows={8}
            loading={leaders.isLoading}
            error={leaders.isError}
            onRetry={() => leaders.refetch()}
            items={leaders.data?.map((r) => ({
              key: r.user_id,
              rank: r.rank,
              name: r.full_name,
              subtitle: [r.class_name, r.level_title].filter(Boolean).join(" · "),
              value: r.xp,
              valueSuffix: tl("xpUnit"),
              isMe: r.is_me,
            }))}
          />
          {s && (
            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Zap className="size-3.5 text-[var(--c-warning)]" aria-hidden />
              {t("xpHint")}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
