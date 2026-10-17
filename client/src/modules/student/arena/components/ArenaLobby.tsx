"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Bot, History, Percent, Swords, Target, Trophy, Users } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { LeaderboardList } from "../../shared/LeaderboardList";
import { useMyGrade } from "../../shared/SetupFields";
import { ErrorBlock, Panel, RowsSkeleton, StatTile } from "../../shared/ui";
import { GRADES } from "../../shared/types";
import { useArenaLeaderboard, useArenaMatches, useArenaStats } from "../useArenaQueries";

const ALL = "all";

function ModeCard({ icon, title, description, tone, onClick }: { icon: React.ReactNode; title: string; description: string; tone: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-28 w-full items-center gap-4 rounded-xl border-2 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      style={{ borderColor: `var(--c-${tone}-bg)` }}
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105" style={{ background: `var(--c-${tone}-bg)`, color: `var(--c-${tone})` }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

/** Sảnh đấu trường: chọn chế độ · thống kê của tôi · bảng vàng · trận gần đây */
export function ArenaLobby({ onAi, onPvp }: { onAi: () => void; onPvp: () => void }) {
  const t = useTranslations("learnArena");
  const tl = useTranslations("learn");
  const { formatNumber } = useNumberFormat();
  const myGrade = useMyGrade();
  const [grade, setGrade] = useState(myGrade ? String(myGrade) : ALL);
  const stats = useArenaStats();
  const leaders = useArenaLeaderboard(grade === ALL ? null : Number(grade));
  const matches = useArenaMatches();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard icon={<Bot className="size-7" />} tone="primary" title={t("lobby.aiTitle")} description={t("lobby.aiDescription")} onClick={onAi} />
        <ModeCard icon={<Users className="size-7" />} tone="error" title={t("lobby.pvpTitle")} description={t("lobby.pvpDescription")} onClick={onPvp} />
      </div>

      {stats.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : stats.isError ? (
        <ErrorBlock onRetry={() => stats.refetch()} />
      ) : stats.data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label={t("stats.matches")} value={formatNumber(stats.data.total_matches)} icon={<Swords />} tone="primary" />
          <StatTile label={t("stats.wins")} value={formatNumber(stats.data.wins)} icon={<Trophy />} tone="success" />
          <StatTile label={t("stats.winRate")} value={t("stats.percent", { value: stats.data.win_rate })} icon={<Percent />} tone="warning" />
          <StatTile label={t("stats.totalScore")} value={formatNumber(stats.data.total_score)} icon={<Target />} tone="purple" />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={t("lobby.leaderboard")}
          icon={<Trophy />}
          bodyClassName="p-2"
          action={
            <Select value={grade} onValueChange={(v) => v && setGrade(v)}>
              <SelectTrigger size="sm" className="w-32" aria-label={tl("setup.grade")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>{t("lobby.allGrades")}</SelectItem>
                {GRADES.map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    {tl("setup.gradeOption", { grade: g })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <LeaderboardList
            loading={leaders.isLoading}
            error={leaders.isError}
            onRetry={() => leaders.refetch()}
            items={leaders.data?.map((r) => ({
              key: r.user_id,
              rank: r.rank,
              name: r.full_name,
              subtitle: t("lobby.wins", { count: r.wins }),
              value: r.total_score,
              valueSuffix: t("lobby.pointsUnit"),
              isMe: r.is_me,
            }))}
          />
        </Panel>

        <Panel title={t("lobby.recent")} icon={<History />}>
          {matches.isLoading ? (
            <RowsSkeleton rows={4} />
          ) : matches.isError ? (
            <ErrorBlock onRetry={() => matches.refetch()} />
          ) : !matches.data?.length ? (
            <EmptyState title={t("lobby.noMatches")} />
          ) : (
            <ul className="divide-y">
              {matches.data.slice(0, 8).map((m) => {
                const draw = m.status === "FINISHED" && !m.is_winner && m.score === m.opponent_score;
                const label = m.status !== "FINISHED" ? "abandoned" : m.is_winner ? "win" : draw ? "draw" : "lose";
                const tone = { win: "success", lose: "error", draw: "info", abandoned: "warning" }[label];
                return (
                  <li key={m.match_id} className="flex items-center gap-3 py-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--c-bg-muted)] text-muted-foreground">
                      {m.mode === "AI" ? <Bot className="size-4" /> : <Users className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{t("lobby.vsName", { name: m.opponent_name || (m.mode === "AI" ? t("ai.opponentName") : t("pvp.opponent")) })}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.topic}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold")} style={{ background: `var(--c-${tone}-bg)`, color: `var(--c-${tone})` }}>
                        {t(`lobby.outcome.${label}`)}
                      </span>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {m.score} - {m.opponent_score}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
