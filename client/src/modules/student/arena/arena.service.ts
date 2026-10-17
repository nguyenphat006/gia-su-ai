import { http } from "@/lib/api/axiosClient";
import { AI_TIMEOUT } from "../shared/learn.service";
import type { AiAnswerOutcome, ArenaAnalysis, ArenaConfig, ArenaLeaderRow, ArenaStats, MatchHistory, MatchResult, MatchStarted } from "../shared/types";

const BASE = "/learn/arena/";

export const arenaService = {
  myStats: () => http.get<ArenaStats>(`${BASE}me/stats/`),
  myMatches: () => http.get<MatchHistory[]>(`${BASE}me/matches/`),
  leaderboard: (grade: number | null) => http.get<ArenaLeaderRow[]>(`${BASE}leaderboard/`, { params: { grade: grade ?? undefined, limit: 10 } }),
  startAi: (c: ArenaConfig) =>
    http.post<MatchStarted>(`${BASE}ai/start/`, { topic: c.topic, count: c.count, difficulties: c.difficulties, grade: c.grade }, { timeout: AI_TIMEOUT }),
  answer: (matchId: number, questionIndex: number, answer: string) =>
    http.post<AiAnswerOutcome>(`${BASE}matches/${matchId}/answer/`, { question_index: questionIndex, answer }),
  finish: (matchId: number) => http.post<MatchResult>(`${BASE}matches/${matchId}/finish/`),
  analysis: (matchId: number) => http.post<ArenaAnalysis>(`${BASE}matches/${matchId}/analysis/`, undefined, { timeout: AI_TIMEOUT }),
};
