"use client";

import { useEffect, useEffectEvent } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { currentQuestion } from "./battleReducer";
import type { ChallengeConfig, LobbyPlayer, ServerMessage } from "./arenaLobby";
import { arenaSocket, useArenaStore } from "./arenaSocket";

/**
 * Kết nối đấu trường PvP trong vòng đời component: mở khi mount, rời trận + đóng khi unmount.
 * Trạng thái đọc qua `useArenaStore` (Zustand) — không setState trong effect.
 */
export function useArenaSocket(enabled: boolean, onMessage?: (msg: ServerMessage) => void) {
  const userId = useAuthStore((s) => s.user?.id ?? 0);
  const handleMessage = useEffectEvent((msg: ServerMessage) => onMessage?.(msg));

  useEffect(() => {
    if (!enabled || !userId) return;
    const unsubscribe = arenaSocket.subscribe((msg) => handleMessage(msg));
    arenaSocket.connect(userId);
    return () => {
      unsubscribe();
      const s = useArenaStore.getState();
      if (s.battle && !s.finished) arenaSocket.send({ type: "match.leave", match_id: s.battle.matchId });
      arenaSocket.disconnect();
    };
  }, [enabled, userId]);

  return {
    myUserId: userId,
    listPlayers: (grade?: number | null) => arenaSocket.send(grade ? { type: "lobby.list", grade } : { type: "lobby.list" }),
    challenge: (target: LobbyPlayer, config: ChallengeConfig) => {
      useArenaStore.setState({ outgoing: { challengeId: null, targetUserId: target.user_id, targetName: target.name, config, sentAt: Date.now() } });
      if (!arenaSocket.send({ type: "challenge.send", target_user_id: target.user_id, config })) useArenaStore.setState({ outgoing: null });
    },
    cancelChallenge: () => {
      const { outgoing } = useArenaStore.getState();
      if (outgoing?.challengeId) arenaSocket.send({ type: "challenge.cancel", challenge_id: outgoing.challengeId });
      useArenaStore.setState({ outgoing: null });
    },
    respond: (challengeId: string, accept: boolean) => {
      arenaSocket.send({ type: "challenge.respond", challenge_id: challengeId, accept });
      useArenaStore.setState((s) => ({ incoming: s.incoming.filter((c) => c.challengeId !== challengeId) }));
    },
    joinQueue: (sameGrade: boolean) => arenaSocket.send({ type: "queue.join", same_grade: sameGrade }),
    leaveQueue: () => arenaSocket.send({ type: "queue.leave" }),
    answer: (answer: string) => {
      const { battle, dispatchBattle } = useArenaStore.getState();
      const q = battle && currentQuestion(battle);
      if (!battle || !q || battle.phase !== "answering") return;
      dispatchBattle({ type: "answer", answer });
      if (!arenaSocket.send({ type: "match.answer", match_id: battle.matchId, question_index: q.index, answer })) dispatchBattle({ type: "answerFailed" });
    },
    next: () => useArenaStore.getState().dispatchBattle({ type: "next" }),
    /** Bỏ cuộc: server xử thua rồi gửi match.finished -> hiện kết quả */
    leaveMatch: () => {
      const { battle, finished, dispatchBattle } = useArenaStore.getState();
      if (!battle || finished) return;
      if (arenaSocket.send({ type: "match.leave", match_id: battle.matchId })) dispatchBattle({ type: "finish" });
      else useArenaStore.setState({ battle: null, opponentUserId: null });
    },
    /** Xong màn kết quả -> về sảnh */
    clearMatch: () => useArenaStore.setState({ battle: null, finished: null, opponentUserId: null, lostMatch: false }),
    prune: () => arenaSocket.prune(),
    retry: () => arenaSocket.retryNow(),
  };
}
