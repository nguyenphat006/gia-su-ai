"use client";

import React, { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Crown, Handshake, Loader2, MessageCircleHeart, RotateCcw, Swords, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { cn } from "@/lib/utils";
import { fireConfetti } from "../../shared/confetti";
import { FormattedContent } from "../../shared/FormattedContent";
import { arenaService } from "../arena.service";

export interface ResultParticipant {
  key: string | number;
  name: string;
  score: number;
  correctCount: number;
  isWinner: boolean;
  xpEarned: number;
  isMe: boolean;
}

export type Outcome = "win" | "lose" | "draw";

export function outcomeOf(participants: ResultParticipant[]): Outcome {
  const me = participants.find((p) => p.isMe);
  if (!participants.some((p) => p.isWinner)) return "draw";
  return me?.isWinner ? "win" : "lose";
}

/** Kết quả trận: thắng / thua / hòa, điểm từng người, XP, nhận xét của cô Trang (AI) */
export function BattleResult({
  matchId,
  participants,
  totalQuestions,
  forfeitNote,
  onAgain,
  onLobby,
}: {
  matchId: number;
  participants: ResultParticipant[];
  totalQuestions: number;
  forfeitNote?: string | null;
  onAgain?: () => void;
  onLobby: () => void;
}) {
  const t = useTranslations("learnArena");
  const outcome = outcomeOf(participants);
  const me = participants.find((p) => p.isMe);
  const analysis = useMutation({
    mutationFn: () => arenaService.analysis(matchId),
    onError: (error) => toast.error(extractErrorMessage(error, t("result.analysisError"))),
  });

  // Pháo giấy khi thắng (hiệu ứng ngoài React)
  useEffect(() => {
    if (outcome === "win") fireConfetti();
  }, [outcome]);

  const tone = outcome === "win" ? "success" : outcome === "draw" ? "info" : "error";
  const Icon = outcome === "win" ? Crown : outcome === "draw" ? Handshake : Swords;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-xl border bg-card p-6 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full animate-in zoom-in-50" style={{ background: `var(--c-${tone}-bg)`, color: `var(--c-${tone})` }}>
          <Icon className="size-8" aria-hidden />
        </span>
        <h2 className="mt-3 text-2xl font-semibold" style={{ color: `var(--c-${tone})` }}>
          {t(`result.${outcome}`)}
        </h2>
        {forfeitNote && <p className="mt-1 text-sm text-muted-foreground">{forfeitNote}</p>}
        {me && me.xpEarned > 0 && (
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--c-warning-bg)] px-3 py-1 text-sm font-semibold text-[var(--c-warning)]">
            <Zap className="size-4" aria-hidden />
            {t("result.xp", { xp: me.xpEarned })}
          </span>
        )}
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {participants.map((p) => (
            <li
              key={p.key}
              className={cn("rounded-lg border p-3 text-left", p.isWinner ? "border-[var(--c-success-border)] bg-[var(--c-success-bg)]" : "bg-[var(--c-bg-subtle)]")}
            >
              <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                {p.isWinner && <Crown className="size-4 shrink-0 text-[var(--c-warning)]" aria-label={t("result.winner")} />}
                <span className="truncate">{p.isMe ? t("result.you", { name: p.name }) : p.name}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("result.scoreLine", { score: p.score, correct: p.correctCount, total: totalQuestions })}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onAgain && (
            <Button onClick={onAgain}>
              <RotateCcw />
              {t("result.again")}
            </Button>
          )}
          <Button variant="outline" onClick={onLobby}>
            {t("result.lobby")}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        {!analysis.data ? (
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <p className="flex-1 text-sm text-muted-foreground">{t("result.analysisHint")}</p>
            <Button variant="outline" onClick={() => analysis.mutate()} disabled={analysis.isPending}>
              {analysis.isPending ? <Loader2 className="animate-spin" /> : <MessageCircleHeart />}
              {analysis.isPending ? t("result.analysing") : t("result.analysis")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MessageCircleHeart className="size-5 text-[var(--c-purple)]" aria-hidden />
              {t("result.analysisTitle")}
              {analysis.data.score != null && <span className="ml-auto text-sm font-medium text-muted-foreground tabular-nums">{t("result.analysisScore", { score: analysis.data.score })}</span>}
            </h3>
            <FormattedContent content={analysis.data.analysis} />
            {analysis.data.advice && (
              <div className="rounded-lg bg-[var(--c-purple-bg)] p-3">
                <p className="mb-1 text-xs font-semibold text-[var(--c-purple)]">{t("result.advice")}</p>
                <FormattedContent content={analysis.data.advice} />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
