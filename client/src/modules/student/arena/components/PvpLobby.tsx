"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw, Shuffle, Swords, Users, X } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Panel, RowsSkeleton } from "../../shared/ui";
import type { ChallengeConfig, LobbyPlayer, OutgoingChallenge } from "../arenaLobby";
import { ArenaConfigDialog } from "./ArenaConfigDialog";

const STATUS_TONE: Record<string, string> = { idle: "success", matching: "warning", "in-battle": "error" };

/** Sảnh PvP: người đang online, thách đấu, ghép trận ngẫu nhiên */
export function PvpLobby({
  players,
  loaded,
  sameGrade,
  onSameGradeChange,
  onRefresh,
  outgoing,
  onChallenge,
  onCancelChallenge,
  onQueue,
}: {
  players: LobbyPlayer[];
  loaded: boolean;
  sameGrade: boolean;
  onSameGradeChange: (v: boolean) => void;
  onRefresh: () => void;
  outgoing: OutgoingChallenge | null;
  onChallenge: (target: LobbyPlayer, config: ChallengeConfig) => void;
  onCancelChallenge: () => void;
  onQueue: () => void;
}) {
  const t = useTranslations("learnArena");
  const tl = useTranslations("learn");
  const [target, setTarget] = useState<LobbyPlayer | null>(null);

  return (
    <div className="space-y-4">
      {outgoing && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--c-primary-border)] bg-[var(--c-primary-bg)] p-3 text-sm">
          <Loader2 className="size-4 animate-spin text-[var(--c-primary)]" aria-hidden />
          <span className="min-w-0 flex-1 text-foreground">{t("pvp.waitingAccept", { name: outgoing.targetName })}</span>
          <Button size="sm" variant="outline" onClick={onCancelChallenge}>
            <X />
            {t("pvp.cancelChallenge")}
          </Button>
        </div>
      )}

      <section className="flex flex-col items-start gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--c-warning-bg)] text-[var(--c-warning)]">
          <Shuffle className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{t("pvp.quickMatch")}</p>
          <p className="text-xs text-muted-foreground">{t("pvp.quickMatchHint")}</p>
        </div>
        <Button onClick={onQueue} disabled={Boolean(outgoing)}>
          <Swords />
          {t("pvp.findMatch")}
        </Button>
      </section>

      <Panel
        title={t("pvp.onlineTitle", { count: players.length })}
        icon={<Users />}
        action={
          <Button variant="ghost" size="icon" className="size-8" onClick={onRefresh} aria-label={t("pvp.refresh")}>
            <RefreshCw />
          </Button>
        }
        bodyClassName="space-y-3 p-3"
      >
        <div className="flex items-center gap-2 px-1">
          <Switch id="pvp-same-grade" checked={sameGrade} onCheckedChange={onSameGradeChange} />
          <Label htmlFor="pvp-same-grade" className="text-sm font-normal">
            {t("pvp.sameGrade")}
          </Label>
        </div>
        {!loaded ? (
          <RowsSkeleton rows={4} />
        ) : !players.length ? (
          <EmptyState title={t("pvp.noPlayers")} description={t("pvp.noPlayersHint")} />
        ) : (
          <ul className="divide-y">
            {players.map((p) => {
              const busy = p.status !== "idle";
              return (
                <li key={p.user_id} className="flex items-center gap-3 px-1 py-2">
                  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--c-bg-muted)] text-sm font-semibold text-foreground">
                    {p.name.trim().charAt(0).toUpperCase()}
                    <span
                      className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[var(--c-surface)]"
                      style={{ background: `var(--c-${STATUS_TONE[p.status] ?? "success"})` }}
                      aria-hidden
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[p.class_name, p.grade ? tl("setup.gradeOption", { grade: p.grade }) : null, t(`pvp.status.${p.status}`)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button size="sm" variant={busy ? "ghost" : "outline"} disabled={busy || Boolean(outgoing)} onClick={() => setTarget(p)} className={cn(!busy && "border-[var(--c-primary-border)] text-[var(--c-primary)]")}>
                    <Swords />
                    {t("pvp.challenge")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <ArenaConfigDialog
        open={target != null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={t("pvp.challengeTitle", { name: target?.name ?? "" })}
        description={t("pvp.challengeDescription")}
        submitLabel={t("pvp.sendChallenge")}
        onSubmit={(c) => {
          if (target) onChallenge(target, { topic: c.topic, count: c.count, difficulties: c.difficulties });
          setTarget(null);
        }}
      />
    </div>
  );
}
