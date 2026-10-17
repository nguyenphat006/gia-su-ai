"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArenaParticipantRow } from "../../types";

/** Người chơi + điểm; người thắng in đậm kèm cúp */
export function PlayerScores({ participants }: { participants: ArenaParticipantRow[] }) {
  const t = useTranslations("reports");
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
      {participants.map((p, i) => (
        <span key={`${p.user_id ?? "ai"}-${i}`} className={cn("inline-flex items-center gap-1 whitespace-nowrap", p.is_winner ? "font-medium text-foreground" : "text-muted-foreground")}>
          {p.is_winner && <Trophy className="size-3.5 text-[var(--c-warning)]" aria-label={t("arena.winner")} />}
          {t("arena.playerScore", { name: p.name, score: p.score })}
        </span>
      ))}
    </span>
  );
}
