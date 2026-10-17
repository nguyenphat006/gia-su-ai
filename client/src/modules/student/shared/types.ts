/** Kiểu dữ liệu cổng học sinh — lấy từ OpenAPI (`Schemas`), chỉ gõ tay phần schema còn để `unknown`. */
import type { Schemas } from "@/types/api";

export type Grade = Schemas["GradeEnum"];
export type Difficulty = Schemas["DifficultyEnum"];
export type QuestionType = Schemas["QuestionTypeEnum"];

export const GRADES: Grade[] = [6, 7, 8, 9];
export const DIFFICULTIES: Difficulty[] = ["NHAN_BIET", "THONG_HIEU", "VAN_DUNG"];

// ---- Thành tích / thử thách / bảng xếp hạng
export type MyStats = Schemas["MyStats"];
export type LevelInfo = Schemas["Level"];
export type ChallengeProgress = Schemas["ChallengeProgress"];
export type CheckInResult = Schemas["CheckIn"];
export type LeaderboardRow = Schemas["LeaderboardRow"];
export type LeaderboardScope = "weekly" | "month" | "all";

// ---- Gia sư AI
export type ChatSession = Schemas["ChatSession"];
export type ChatMessage = Schemas["ChatMessage"];
export type ChatRole = Schemas["RoleEnum"];
export type SendMessageResult = Schemas["SendMessageResult"];

// ---- Ôn tập
export type PublicQuestion = Schemas["PublicQuestion"];
export type CheckAnswerResult = Schemas["CheckAnswerResult"];
export type QuizAttemptHistory = Schemas["QuizAttemptHistory"];
export type QuizStartInput = Schemas["QuizStartRequest"];

/** Một dòng `results` của bài nộp (server trả dict tự do — xem revision/practice.py) */
export interface QuizResultItem {
  question_id?: number;
  card_index?: number;
  answer: string;
  is_correct: boolean;
  correct_answer: string;
  explanation?: string;
}

export interface QuizResult extends Omit<Schemas["QuizResult"], "results"> {
  results: QuizResultItem[];
}

export interface FlashCard {
  front: string;
  back: string;
}

export interface FlashcardDeck extends Omit<Schemas["LearnFlashcardDeck"], "cards"> {
  cards: FlashCard[];
}

export interface MindmapNode {
  id: string;
  label: string;
  parentId: string | null;
}

export interface Mindmap extends Omit<Schemas["LearnMindmap"], "nodes"> {
  nodes: MindmapNode[];
}

// ---- Đấu trường
export type ArenaQuestion = Schemas["ArenaQuestion"];
export type MatchStarted = Schemas["MatchStarted"];
export type AiAnswerOutcome = Schemas["AiAnswerOutcome"];
export type MatchResult = Schemas["MatchResult"];
export type ParticipantResult = Schemas["ParticipantResult"];
export type ArenaAnalysis = Schemas["Analysis"];
export type ArenaStats = Schemas["ArenaStats"];
export type ArenaLeaderRow = Schemas["ArenaLeaderRow"];
export type MatchHistory = Schemas["MatchHistory"];

export interface ArenaConfig {
  topic: string;
  count: number;
  difficulties: Difficulty[];
  grade: Grade | null;
}
