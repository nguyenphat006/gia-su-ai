"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, ShieldAlert, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/feedback/confirm";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLeaveGuardStore } from "../../shared/leaveGuard";
import { useMyGrade } from "../../shared/SetupFields";
import { useLearnProgressRefresh } from "../../shared/useLearnQueries";
import { shouldShowResult, type ServerMessage } from "../arenaLobby";
import { useArenaStore } from "../arenaSocket";
import { useArenaSocket } from "../useArenaSocket";
import { useInvalidateArena } from "../useArenaQueries";
import { BattleResult } from "./BattleResult";
import { BattleScreen } from "./BattleScreen";
import { IncomingChallengeDialog } from "./IncomingChallengeDialog";
import { PvpLobby } from "./PvpLobby";
import { useBeforeUnload } from "./useBeforeUnload";

const LOBBY_REFRESH_MS = 15_000;

/** Đấu PvP qua WebSocket: sảnh -> (thách đấu | ghép ngẫu nhiên) -> trận -> kết quả */
export function PvpArena({ onBack }: { onBack: () => void }) {
  const t = useTranslations("learnArena");
  const confirm = useConfirm();
  const myName = useAuthStore((s) => s.user?.full_name || s.user?.username || "");
  const myGrade = useMyGrade();
  const refreshProgress = useLearnProgressRefresh();
  const invalidateArena = useInvalidateArena();
  const [sameGrade, setSameGrade] = useState(Boolean(myGrade));

  const handleMessage = (msg: ServerMessage) => {
    if (msg.type === "error") toast.error(msg.message || t("pvp.genericError"));
    else if (msg.type === "challenge.declined") toast.info(t("pvp.declined", { name: msg.by?.name ?? "" }));
    else if (msg.type === "challenge.cancelled") toast.info(t("pvp.cancelled"));
    else if (msg.type === "match.finished") {
      refreshProgress();
      invalidateArena();
    }
  };
  const socket = useArenaSocket(true, handleMessage);
  const status = useArenaStore((s) => s.status);
  const players = useArenaStore((s) => s.players);
  const playersLoaded = useArenaStore((s) => s.playersLoaded);
  const incoming = useArenaStore((s) => s.incoming);
  const outgoing = useArenaStore((s) => s.outgoing);
  const queue = useArenaStore((s) => s.queue);
  const battle = useArenaStore((s) => s.battle);
  const finished = useArenaStore((s) => s.finished);
  const lostMatch = useArenaStore((s) => s.lostMatch);
  const showResult = useArenaStore(shouldShowResult);
  const inBattle = Boolean(battle && !finished);
  const inLobby = status === "open" && !battle && !finished && queue === "idle";
  const gradeFilter = sameGrade ? myGrade : null;

  // Danh sách người chơi: tải khi vào sảnh, làm mới mỗi 15s khi tab đang hiển thị; dọn lời mời hết hạn
  useEffect(() => {
    if (!inLobby) return;
    socket.listPlayers(gradeFilter);
    const id = window.setInterval(() => {
      socket.prune();
      if (document.visibilityState === "visible") socket.listPlayers(gradeFilter);
    }, LOBBY_REFRESH_MS);
    return () => window.clearInterval(id);
    // socket.* là hàm gửi tin nhắn (ổn định theo nghĩa), chỉ chạy lại khi vào sảnh / đổi bộ lọc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inLobby, gradeFilter]);

  // Đang đấu: hỏi trước khi rời trang (menu / đóng tab); rời = match.leave
  useBeforeUnload(inBattle);
  useEffect(() => {
    if (!inBattle) return;
    useLeaveGuardStore.getState().set(() => socket.leaveMatch());
    return () => useLeaveGuardStore.getState().set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inBattle]);

  const leaveBattle = async () => {
    const ok = await confirm({ title: t("battle.leaveTitle"), description: t("battle.leavePvpDescription"), confirmText: t("battle.leave"), danger: true });
    if (ok) socket.leaveMatch();
  };

  const header = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onBack} disabled={inBattle}>
        <ArrowLeft />
        {t("lobby.back")}
      </Button>
    </div>
  );

  if (status === "forbidden" || status === "unauthorized" || status === "closed") {
    const forbidden = status === "forbidden";
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center">
          {forbidden ? <ShieldAlert className="size-10 text-[var(--c-error)]" /> : <WifiOff className="size-10 text-muted-foreground" />}
          <p className="text-sm text-muted-foreground">{t(`connection.${status}`)}</p>
          {!forbidden && <Button onClick={socket.retry}>{t("connection.retry")}</Button>}
        </div>
      </div>
    );
  }

  if (showResult && finished) {
    const totalQuestions = battle?.questions.length ?? 0;
    const forfeitNote =
      finished.forfeit_user_id == null ? null : finished.forfeit_user_id === socket.myUserId ? t("result.youForfeited") : t("result.opponentForfeited");
    return (
      <BattleResult
        matchId={finished.match_id}
        totalQuestions={totalQuestions}
        forfeitNote={forfeitNote}
        onLobby={socket.clearMatch}
        participants={finished.participants.map((p, i) => {
          const isMe = p.user_id === socket.myUserId;
          return {
            key: p.user_id ?? i,
            name: isMe ? myName : battle?.opponentName || t("pvp.opponent"),
            score: p.score,
            correctCount: p.correct_count,
            isWinner: p.is_winner,
            xpEarned: p.xp_earned,
            isMe,
          };
        })}
      />
    );
  }

  if (battle) {
    if (battle.phase === "done") {
      return (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" />
          {t("battle.finishing")}
        </p>
      );
    }
    return <BattleScreen state={battle} mode="pvp" myName={myName} onAnswer={socket.answer} onRevealDone={socket.next} onLeave={leaveBattle} />;
  }

  return (
    <div className="space-y-4">
      {header}
      {lostMatch && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-[var(--c-warning-border)] bg-[var(--c-warning-bg)] p-3 text-sm text-[var(--c-text-2)]">
          <WifiOff className="size-4 shrink-0 text-[var(--c-warning)]" />
          <span className="flex-1">{t("connection.lostMatch")}</span>
          <Button variant="ghost" size="icon" className="size-7" onClick={socket.clearMatch} aria-label={t("connection.dismiss")}>
            <X />
          </Button>
        </div>
      )}
      {status !== "open" ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" />
          {t(status === "reconnecting" ? "connection.reconnecting" : "connection.connecting")}
        </p>
      ) : queue === "waiting" ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center" role="status">
          <span className="relative flex size-16 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--c-primary-bg)]" />
            <Loader2 className="relative size-8 animate-spin text-[var(--c-primary)]" />
          </span>
          <div>
            <p className="text-base font-semibold text-foreground">{t("pvp.searching")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("pvp.searchingHint")}</p>
          </div>
          <Button variant="outline" onClick={socket.leaveQueue}>
            <X />
            {t("pvp.cancelSearch")}
          </Button>
        </div>
      ) : (
        <PvpLobby
          players={players}
          loaded={playersLoaded}
          sameGrade={sameGrade}
          onSameGradeChange={setSameGrade}
          onRefresh={() => socket.listPlayers(gradeFilter)}
          outgoing={outgoing}
          onChallenge={socket.challenge}
          onCancelChallenge={socket.cancelChallenge}
          onQueue={() => socket.joinQueue(sameGrade)}
        />
      )}
      <IncomingChallengeDialog challenge={incoming[0] ?? null} onRespond={socket.respond} />
    </div>
  );
}
