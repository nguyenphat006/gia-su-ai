"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RelativeTime } from "@/components/list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useArenaMatch } from "../../hooks/useReportsQuery";
import { ARENA_MODE, MATCH_STATUS } from "../../statusMaps";
import type { ArenaAnswerPlayer, ArenaMatchDetail } from "../../types";
import { PlayerScores } from "./PlayerScores";

function AnswerCell({ player }: { player: ArenaAnswerPlayer | undefined }) {
  const t = useTranslations("reports");
  if (!player || player.answer === null) return <span className="text-muted-foreground">{t("arena.noAnswer")}</span>;
  return (
    <span className="flex items-start gap-1.5">
      {player.is_correct ? (
        <Check className="mt-0.5 size-4 shrink-0 text-[var(--c-success)]" aria-label={t("arena.correct")} />
      ) : (
        <X className="mt-0.5 size-4 shrink-0 text-[var(--c-error)]" aria-label={t("arena.wrong")} />
      )}
      <span className="min-w-0">
        <span className="block break-words text-foreground">{player.answer}</span>
        {player.points != null && <span className="block text-xs text-muted-foreground">{t("arena.points", { points: player.points })}</span>}
      </span>
    </span>
  );
}

function MatchBody({ match }: { match: ArenaMatchDetail }) {
  const t = useTranslations("reports");
  const ta = useTranslations("academics");
  // answers[].players và participants cùng thứ tự (backend duyệt match.participants.all())
  const players = match.participants;
  const analyses = Object.entries(match.ai_analysis ?? {})
    .map(([userId, a]) => ({ userId, name: players.find((p) => String(p.user_id) === userId)?.name ?? userId, ...a }))
    .filter((a) => a.analysis || a.advice);

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StatusBadge map={ARENA_MODE} value={match.mode} />
        <StatusBadge map={MATCH_STATUS} value={match.status} />
        {match.grade != null && <span>{ta("grade", { grade: match.grade })}</span>}
        <RelativeTime value={match.created_at} />
      </div>
      <PlayerScores participants={players} />

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">{t("arena.questions")}</h3>
        {match.answers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("arena.noQuestions")}</p>
        ) : (
          <div className="dt-scroll">
            <table className="dt text-sm">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th className="min-w-56">{t("fields.question")}</th>
                  <th className="min-w-32">{t("fields.correctAnswer")}</th>
                  {players.map((p, i) => (
                    <th key={`${p.user_id ?? "ai"}-${i}`} className="min-w-36">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {match.answers.map((row) => (
                  <tr key={row.index}>
                    <td className="align-top text-muted-foreground tabular-nums">{row.index + 1}</td>
                    <td className="align-top break-words whitespace-pre-wrap">{row.content}</td>
                    <td className="align-top break-words">{row.correct_answer}</td>
                    {players.map((p, i) => (
                      <td key={`${p.user_id ?? "ai"}-${i}`} className="align-top">
                        <AnswerCell player={row.players[i]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {analyses.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t("arena.aiAnalysis")}</h3>
          {analyses.map((a) => (
            <div key={a.userId} className="space-y-1 rounded-md bg-[var(--c-bg-subtle)] p-3 text-sm">
              <p className="font-medium text-foreground">
                {a.name}
                {a.score != null && <span className="ml-2 font-normal text-muted-foreground">{t("arena.aiScore", { score: a.score })}</span>}
              </p>
              {a.analysis && <p className="whitespace-pre-wrap text-foreground">{a.analysis}</p>}
              {a.advice && (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  <span className="font-medium text-foreground">{t("arena.advice")}: </span>
                  {a.advice}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/** Ngăn chi tiết trận đấu: bảng từng câu (đáp án đúng, câu trả lời ✓/✗ + điểm của từng người) + nhận xét AI */
export function ArenaMatchDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const { data, isLoading, isError, refetch } = useArenaMatch(id);

  return (
    <Sheet open={id !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-[760px]">
        <SheetHeader className="border-b">
          <SheetTitle className="pr-6">{data?.topic ?? t("arena.detailTitle")}</SheetTitle>
          <SheetDescription className="sr-only">{t("arena.detailTitle")}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pt-4">
          {isLoading ? (
            <div className="space-y-3 px-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : isError || !data ? (
            <div className="space-y-3 px-4 text-sm text-muted-foreground">
              <p>{t("arena.loadError")}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                {tc("actions.retry")}
              </Button>
            </div>
          ) : (
            <MatchBody match={data} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
