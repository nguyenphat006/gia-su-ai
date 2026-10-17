"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LEARN_KEY } from "../shared/useLearnQueries";
import { arenaService } from "./arena.service";

export const ARENA_KEY = [...LEARN_KEY, "arena"] as const;

export function useArenaStats() {
  return useQuery({ queryKey: [...ARENA_KEY, "stats"], queryFn: arenaService.myStats, staleTime: 60_000 });
}

export function useArenaMatches() {
  return useQuery({ queryKey: [...ARENA_KEY, "matches"], queryFn: arenaService.myMatches, staleTime: 60_000 });
}

export function useArenaLeaderboard(grade: number | null) {
  return useQuery({ queryKey: [...ARENA_KEY, "leaderboard", grade], queryFn: () => arenaService.leaderboard(grade), staleTime: 60_000 });
}

/** Sau một trận: làm mới thống kê / lịch sử / bảng vàng đấu trường */
export function useInvalidateArena() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ARENA_KEY });
}
