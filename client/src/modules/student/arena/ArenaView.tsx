"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import type { ArenaConfig, MatchStarted } from "../shared/types";
import { arenaService } from "./arena.service";
import { AiBattle } from "./components/AiBattle";
import { ArenaConfigDialog } from "./components/ArenaConfigDialog";
import { ArenaLobby } from "./components/ArenaLobby";
import { PvpArena } from "./components/PvpArena";

type View = { kind: "lobby" } | { kind: "ai"; started: MatchStarted; run: number } | { kind: "pvp" };

/** Đấu trường: sảnh -> đấu với AI (REST) hoặc đấu PvP (WebSocket) */
export function ArenaView() {
  const t = useTranslations("learnArena");
  const [view, setView] = useState<View>({ kind: "lobby" });
  const [configOpen, setConfigOpen] = useState(false);
  const [lastConfig, setLastConfig] = useState<ArenaConfig | null>(null);

  const startAi = useMutation({
    mutationFn: (c: ArenaConfig) => arenaService.startAi(c),
    onSuccess: (started) => {
      setConfigOpen(false);
      setView((v) => ({ kind: "ai", started, run: v.kind === "ai" ? v.run + 1 : 0 }));
    },
    onError: (error) => toast.error(extractErrorMessage(error, t("ai.startError"))),
  });

  const begin = (c: ArenaConfig) => {
    setLastConfig(c);
    startAi.mutate(c);
  };

  return (
    <div className="space-y-4">
      {view.kind === "lobby" && (
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      )}

      {view.kind === "lobby" && <ArenaLobby onAi={() => setConfigOpen(true)} onPvp={() => setView({ kind: "pvp" })} />}
      {view.kind === "pvp" && <PvpArena onBack={() => setView({ kind: "lobby" })} />}
      {view.kind === "ai" &&
        (startAi.isPending ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" />
            {t("ai.preparing")}
          </p>
        ) : (
          <AiBattle
            key={`${view.started.match_id}-${view.run}`}
            started={view.started}
            onExit={() => setView({ kind: "lobby" })}
            onAgain={() => (lastConfig ? begin(lastConfig) : setConfigOpen(true))}
          />
        ))}

      <ArenaConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        title={t("ai.configTitle")}
        description={t("ai.configDescription")}
        submitLabel={startAi.isPending ? t("ai.preparing") : t("ai.start")}
        showGrade
        loading={startAi.isPending}
        onSubmit={begin}
      />
    </div>
  );
}
