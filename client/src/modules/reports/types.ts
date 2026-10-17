import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu Báo cáo học tập (server/apps/analytics/views.py). Ngày giờ dạng "dd/mm/yyyy HH:MM". */
export type ReportOverview = Schemas["Overview"];
export type DailyPoint = Schemas["DailyPoint"];
export type HeatmapCell = Schemas["HeatmapCell"];
export type LeaderRow = Schemas["LeaderRow"];
export type StudentReportRow = Schemas["StudentReport"];
export type StudentReportSummary = Schemas["StudentStatsDetail"];
export type LearningEventType = Schemas["EventTypeEnum"];
export type ArenaMode = Schemas["ModeEnum"];
export type ArenaMatchStatus = Schemas["MatchStatusEnum"];
export type QuizType = Schemas["QuizTypeEnum"];
export type ChatLogRow = Schemas["ChatPair"];
export type QuizAttemptRow = Schemas["QuizAttemptReport"];

export interface LearningEventRow extends Omit<Schemas["LearningEvent"], "metadata"> {
  /** QUIZ / FLASHCARD_VIEW / MINDMAP_VIEW: { grade, topic }; CHAT: { grade }; ARENA: { mode, topic, winner } */
  metadata?: { grade?: number | null; topic?: string | null; mode?: ArenaMode; winner?: boolean } | null;
}

/** OpenAPI chưa mô tả cấu trúc lồng (SerializerMethodField) -> khai báo tay theo serializer */
export interface ArenaParticipantRow {
  /** null = Gia sư AI */
  user_id: number | null;
  name: string;
  score: number;
  correct_count: number;
  is_winner: boolean;
}

export interface ArenaMatchRow extends Omit<Schemas["ArenaMatchReport"], "participants"> {
  participants: ArenaParticipantRow[];
}

export interface ArenaAnswerPlayer {
  user_id: number | null;
  answer: string | null;
  is_correct: boolean;
  points: number | null;
}

export interface ArenaAnswerRow {
  index: number;
  content: string;
  correct_answer: string;
  players: ArenaAnswerPlayer[];
}

/** Nhận xét AI lưu theo user_id của người chơi đã yêu cầu */
export interface ArenaAiAnalysis {
  score?: number | null;
  analysis?: string;
  advice?: string;
}

export interface ArenaMatchDetail extends ArenaMatchRow {
  answers: ArenaAnswerRow[];
  ai_analysis?: Record<string, ArenaAiAnalysis> | null;
}

/** Tham số phạm vi chung gửi lên API báo cáo */
export type ReportScopeParams = {
  date_from: string;
  date_to: string;
  grade?: string;
  school_class?: string;
};

export type ReportParams = Record<string, string | number>;
