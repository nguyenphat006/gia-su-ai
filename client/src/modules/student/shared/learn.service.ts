import { http } from "@/lib/api/axiosClient";
import type { ChallengeProgress, CheckInResult, LeaderboardRow, LeaderboardScope, MyStats } from "./types";

/** Yêu cầu chạy AI (chấm tự luận, sinh đề, gia sư) có thể mất 5–30 giây -> nới thời gian chờ */
export const AI_TIMEOUT = 120_000;

export interface LeaderboardParams {
  scope?: LeaderboardScope;
  grade?: number | null;
  limit?: number;
}

export const learnService = {
  checkIn: () => http.post<CheckInResult>("/learn/me/check-in/"),
  getStats: () => http.get<MyStats>("/learn/me/stats/"),
  getChallenges: () => http.get<ChallengeProgress[]>("/learn/me/challenges/"),
  getLeaderboard: ({ scope = "weekly", grade, limit }: LeaderboardParams) =>
    http.get<LeaderboardRow[]>("/learn/leaderboard/", { params: { scope, grade: grade ?? undefined, limit } }),
};
