import { http } from "@/lib/api/axiosClient";
import type { Paginated } from "@/lib/api/types";
import type {
  ArenaMatchDetail,
  ArenaMatchRow,
  ChatLogRow,
  HeatmapCell,
  LeaderRow,
  LearningEventRow,
  QuizAttemptRow,
  ReportOverview,
  ReportParams,
  StudentReportRow,
  StudentReportSummary,
} from "../types";

const BASE = "/reports";

/** Báo cáo học tập — chỉ đọc (REPORT_READ); xuất Excel danh sách học sinh qua useExcelExport (`/reports/students/`) */
export const reportService = {
  overview: (params: ReportParams) => http.get<ReportOverview>(`${BASE}/overview/`, { params }),
  heatmap: (params: ReportParams) => http.get<HeatmapCell[]>(`${BASE}/heatmap/`, { params }),
  xpLeaderboard: (params: ReportParams) => http.get<LeaderRow[]>(`${BASE}/xp-leaderboard/`, { params }),

  students: (params: ReportParams) => http.get<Paginated<StudentReportRow>>(`${BASE}/students/`, { params }),
  student: (id: number) => http.get<StudentReportRow>(`${BASE}/students/${id}/`),
  studentSummary: (id: number) => http.get<StudentReportSummary>(`${BASE}/students/${id}/summary/`),
  studentTimeline: (id: number, params: ReportParams) => http.get<Paginated<LearningEventRow>>(`${BASE}/students/${id}/timeline/`, { params }),

  chatLogs: (params: ReportParams) => http.get<Paginated<ChatLogRow>>(`${BASE}/chat-logs/`, { params }),
  chatLog: (id: number) => http.get<ChatLogRow>(`${BASE}/chat-logs/${id}/`),

  arenaMatches: (params: ReportParams) => http.get<Paginated<ArenaMatchRow>>(`${BASE}/arena-matches/`, { params }),
  arenaMatch: (id: number) => http.get<ArenaMatchDetail>(`${BASE}/arena-matches/${id}/`),

  quizAttempts: (params: ReportParams) => http.get<Paginated<QuizAttemptRow>>(`${BASE}/quiz-attempts/`, { params }),
};
