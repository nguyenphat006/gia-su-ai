"use client";

import React, { useEffect, useReducer, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useConfirm } from "@/components/feedback/confirm";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLeaveGuardStore } from "../../shared/leaveGuard";
import { useLearnProgressRefresh } from "../../shared/useLearnQueries";
import type { MatchResult, MatchStarted } from "../../shared/types";
import { arenaService } from "../arena.service";
import { battleReducer, createBattle, currentQuestion, isLastQuestion } from "../battleReducer";
import { useInvalidateArena } from "../useArenaQueries";
import { BattleResult } from "./BattleResult";
import { BattleScreen } from "./BattleScreen";
import { useBeforeUnload } from "./useBeforeUnload";

/** Trận đấu với AI (REST): trả lời -> server chấm + AI đi nước -> xem đáp án -> … -> kết thúc, chốt XP */
export function AiBattle({ started, onExit, onAgain }: { started: MatchStarted; onExit: () => void; onAgain: () => void }) {
  const t = useTranslations("learnArena");
  const confirm = useConfirm();
  const myName = useAuthStore((s) => s.user?.full_name || s.user?.username || "");
  const refreshProgress = useLearnProgressRefresh();
  const invalidateArena = useInvalidateArena();
  const [state, dispatch] = useReducer(battleReducer, started, (s) => createBattle({ ...s, opponentName: t("ai.opponentName") }));
  const [result, setResult] = useState<MatchResult | null>(null);

  const answer = useMutation({
    mutationFn: ({ index, value }: { index: number; value: string }) => arenaService.answer(state.matchId, index, value),
    onSuccess: (outcome) => dispatch({ type: "aiOutcome", outcome }),
    onError: (error) => {
      toast.error(extractErrorMessage(error, t("battle.answerError")));
      dispatch({ type: "answerFailed" });
    },
  });

  const finish = useMutation({
    mutationFn: () => arenaService.finish(state.matchId),
    onSuccess: (r) => {
      setResult(r);
      dispatch({ type: "finish" });
      refreshProgress();
      invalidateArena();
    },
    onError: (error) => toast.error(extractErrorMessage(error, t("battle.finishError"))),
  });

  const inProgress = !result;
  useBeforeUnload(inProgress);
  // Chặn rời trang qua menu khi đang đấu (không có API hủy trận AI -> chỉ hỏi xác nhận)
  useEffect(() => {
    if (!inProgress) return;
    useLeaveGuardStore.getState().set(() => {});
    return () => useLeaveGuardStore.getState().set(null);
  }, [inProgress]);

  const handleAnswer = (value: string) => {
    const q = currentQuestion(state);
    if (!q || state.phase !== "answering") return;
    dispatch({ type: "answer", answer: value });
    answer.mutate({ index: q.index, value });
  };

  const handleRevealDone = () => {
    if (state.phase !== "reveal") return;
    if (isLastQuestion(state)) {
      if (!finish.isPending && !result) finish.mutate();
      return;
    }
    dispatch({ type: "next" });
  };

  const leave = async () => {
    const ok = await confirm({ title: t("battle.leaveTitle"), description: t("battle.leaveAiDescription"), confirmText: t("battle.leave"), danger: true });
    if (ok) {
      useLeaveGuardStore.getState().set(null);
      onExit();
    }
  };

  if (result) {
    return (
      <BattleResult
        matchId={result.match_id}
        totalQuestions={result.total_questions}
        onAgain={onAgain}
        onLobby={onExit}
        participants={result.participants.map((p, i) => ({
          key: p.user_id ?? `ai-${i}`,
          name: p.user_id == null ? p.name || t("ai.opponentName") : p.name,
          score: p.score,
          correctCount: p.correct_count,
          isWinner: p.is_winner,
          xpEarned: p.xp_earned,
          isMe: p.is_me,
        }))}
      />
    );
  }

  return (
    <BattleScreen
      state={state}
      mode="ai"
      myName={myName}
      onAnswer={handleAnswer}
      onRevealDone={handleRevealDone}
      onLeave={leave}
      finishing={finish.isPending}
    />
  );
}
