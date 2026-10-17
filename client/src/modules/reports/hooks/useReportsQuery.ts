"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportService } from "../services/report.service";
import type { ReportParams } from "../types";

/** Mọi query của báo cáo lồng dưới key gốc này */
export const REPORTS_QUERY_KEY = ["reports"] as const;
/** Số liệu tổng hợp ít đổi trong vài phút */
const STATS_STALE_MS = 60_000;

export const reportKeys = {
  overview: (p: ReportParams) => [...REPORTS_QUERY_KEY, "overview", p] as const,
  heatmap: (p: ReportParams) => [...REPORTS_QUERY_KEY, "heatmap", p] as const,
  leaderboard: (p: ReportParams) => [...REPORTS_QUERY_KEY, "xp-leaderboard", p] as const,
  students: (p: ReportParams) => [...REPORTS_QUERY_KEY, "students", "list", p] as const,
  student: (id: number) => [...REPORTS_QUERY_KEY, "students", "detail", id] as const,
  summary: (id: number) => [...REPORTS_QUERY_KEY, "students", "summary", id] as const,
  timeline: (id: number, p: ReportParams) => [...REPORTS_QUERY_KEY, "students", "timeline", id, p] as const,
  chatLogs: (p: ReportParams) => [...REPORTS_QUERY_KEY, "chat-logs", "list", p] as const,
  chatLog: (id: number) => [...REPORTS_QUERY_KEY, "chat-logs", "detail", id] as const,
  arenaMatches: (p: ReportParams) => [...REPORTS_QUERY_KEY, "arena-matches", "list", p] as const,
  arenaMatch: (id: number) => [...REPORTS_QUERY_KEY, "arena-matches", "detail", id] as const,
  quizAttempts: (p: ReportParams) => [...REPORTS_QUERY_KEY, "quiz-attempts", "list", p] as const,
};

export function useReportOverview(params: ReportParams) {
  return useQuery({ queryKey: reportKeys.overview(params), queryFn: () => reportService.overview(params), staleTime: STATS_STALE_MS, placeholderData: keepPreviousData });
}

export function useReportHeatmap(params: ReportParams) {
  return useQuery({ queryKey: reportKeys.heatmap(params), queryFn: () => reportService.heatmap(params), staleTime: STATS_STALE_MS, placeholderData: keepPreviousData });
}

export function useXpLeaderboard(params: ReportParams) {
  return useQuery({ queryKey: reportKeys.leaderboard(params), queryFn: () => reportService.xpLeaderboard(params), staleTime: STATS_STALE_MS, placeholderData: keepPreviousData });
}

export function useStudentReports(params: ReportParams) {
  return useQuery({ queryKey: reportKeys.students(params), queryFn: () => reportService.students(params), placeholderData: keepPreviousData });
}

export function useStudentReport(id: number) {
  return useQuery({ queryKey: reportKeys.student(id), queryFn: () => reportService.student(id), enabled: id > 0 });
}

export function useStudentSummary(id: number) {
  return useQuery({ queryKey: reportKeys.summary(id), queryFn: () => reportService.studentSummary(id), enabled: id > 0, staleTime: STATS_STALE_MS });
}

export function useStudentTimeline(id: number, params: ReportParams) {
  return useQuery({ queryKey: reportKeys.timeline(id, params), queryFn: () => reportService.studentTimeline(id, params), enabled: id > 0, placeholderData: keepPreviousData });
}

export function useChatLogs(params: ReportParams) {
  return useQuery({ queryKey: reportKeys.chatLogs(params), queryFn: () => reportService.chatLogs(params), placeholderData: keepPreviousData });
}

/** Chi tiết chỉ tải khi mở ngăn */
export function useChatLog(id: number | null) {
  return useQuery({ queryKey: reportKeys.chatLog(id ?? 0), queryFn: () => reportService.chatLog(id as number), enabled: !!id, staleTime: 5 * 60_000 });
}

export function useArenaMatches(params: ReportParams) {
  return useQuery({ queryKey: reportKeys.arenaMatches(params), queryFn: () => reportService.arenaMatches(params), placeholderData: keepPreviousData });
}

export function useArenaMatch(id: number | null) {
  return useQuery({ queryKey: reportKeys.arenaMatch(id ?? 0), queryFn: () => reportService.arenaMatch(id as number), enabled: !!id, staleTime: 5 * 60_000 });
}

export function useQuizAttempts(params: ReportParams) {
  return useQuery({ queryKey: reportKeys.quizAttempts(params), queryFn: () => reportService.quizAttempts(params), placeholderData: keepPreviousData });
}
