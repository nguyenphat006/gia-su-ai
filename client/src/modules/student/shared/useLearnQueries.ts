"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { learnService, type LeaderboardParams } from "./learn.service";

/** Gốc query key cổng học sinh — XP / thử thách / xếp hạng đổi sau mỗi hoạt động học */
export const LEARN_KEY = ["learn"] as const;
export const LEARN_STATS_KEY = [...LEARN_KEY, "stats"] as const;
export const LEARN_CHALLENGES_KEY = [...LEARN_KEY, "challenges"] as const;
export const LEARN_LEADERBOARD_KEY = [...LEARN_KEY, "leaderboard"] as const;

export function useMyStats() {
  return useQuery({ queryKey: LEARN_STATS_KEY, queryFn: learnService.getStats, staleTime: 60_000 });
}

export function useMyChallenges() {
  return useQuery({ queryKey: LEARN_CHALLENGES_KEY, queryFn: learnService.getChallenges, staleTime: 60_000 });
}

export function useLeaderboard(params: LeaderboardParams) {
  return useQuery({
    queryKey: [...LEARN_LEADERBOARD_KEY, params.scope ?? "weekly", params.grade ?? null, params.limit ?? null],
    queryFn: () => learnService.getLeaderboard(params),
    staleTime: 60_000,
  });
}

/**
 * Sau một hoạt động có cộng XP: làm mới số liệu thành tích + báo thử thách vừa hoàn thành.
 * Gọi trong `onSuccess` của mutation (không gọi trong effect).
 */
export function useLearnProgressRefresh() {
  const queryClient = useQueryClient();
  const t = useTranslations("learn");
  return (completedChallenges: string[] = []) => {
    queryClient.invalidateQueries({ queryKey: LEARN_STATS_KEY });
    queryClient.invalidateQueries({ queryKey: LEARN_CHALLENGES_KEY });
    queryClient.invalidateQueries({ queryKey: LEARN_LEADERBOARD_KEY });
    for (const name of completedChallenges) toast.success(t("challengeCompleted", { name }));
  };
}
