"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDifficultyLabel } from "../../shared/SetupFields";
import { CHALLENGE_TTL_MS, type IncomingChallenge } from "../arenaLobby";
import { AutoAdvance } from "./timers";

/** Lời thách đấu đến: Nhận / Từ chối; tự hết hạn sau 2 phút */
export function IncomingChallengeDialog({ challenge, onRespond }: { challenge: IncomingChallenge | null; onRespond: (id: string, accept: boolean) => void }) {
  const t = useTranslations("learnArena");
  const tl = useTranslations("learn");
  const difficultyLabel = useDifficultyLabel();
  if (!challenge) return null;
  const { from, config } = challenge;
  const details = [
    config.topic,
    t("pvp.questionCount", { count: config.count }),
    config.difficulties.length ? config.difficulties.map(difficultyLabel).join(", ") : null,
  ].filter(Boolean);

  return (
    <Dialog open onOpenChange={(open) => !open && onRespond(challenge.challengeId, false)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="size-5 text-[var(--c-error)]" aria-hidden />
            {t("pvp.incomingTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("pvp.incomingDescription", { name: from.name })}
            {from.class_name ? ` (${tl("shell.classLabel", { name: from.class_name })})` : ""}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 rounded-lg bg-[var(--c-bg-subtle)] p-3 text-sm text-foreground">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onRespond(challenge.challengeId, false)}>
            {t("pvp.decline")}
          </Button>
          <Button onClick={() => onRespond(challenge.challengeId, true)}>
            <Swords />
            {t("pvp.accept")}
          </Button>
        </DialogFooter>
        {/* Hết hạn -> coi như từ chối */}
        <AutoAdvance key={challenge.challengeId} ms={CHALLENGE_TTL_MS} onDone={() => onRespond(challenge.challengeId, false)} />
      </DialogContent>
    </Dialog>
  );
}
