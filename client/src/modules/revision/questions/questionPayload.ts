import { EMPTY_SCOPE, fromGrade, scopePayload, toGradePayload, type ScopeFormValues } from "../shared/scope";
import type { Difficulty, QuestionCreateInput, QuestionDraft, QuestionItem, QuestionStatus, QuestionType } from "./types";

export const QUESTION_TYPES: readonly QuestionType[] = ["MULTIPLE_CHOICE", "ESSAY"];
export const DIFFICULTIES: readonly Difficulty[] = ["NHAN_BIET", "THONG_HIEU", "VAN_DUNG"];
export const QUESTION_STATUSES: readonly QuestionStatus[] = ["PENDING", "APPROVED", "REJECTED"];
/** Câu trắc nghiệm luôn có đúng 4 phương án (backend kiểm tra) */
export const OPTION_COUNT = 4;
export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export interface QuestionFormValues extends ScopeFormValues {
  question_type: QuestionType;
  difficulty: Difficulty;
  content: string;
  /** Luôn 4 phần tử (chỉ dùng khi trắc nghiệm) */
  options: string[];
  /** Chỉ số phương án đúng "0".."3"; "" = chưa chọn */
  correct_index: string;
  /** Đáp án mẫu của câu tự luận */
  sample_answer: string;
  explanation: string;
  hint: string;
  status: QuestionStatus;
  is_active: boolean;
}

const blankOptions = () => Array.from({ length: OPTION_COUNT }, () => "");

export const EMPTY_QUESTION: QuestionFormValues = {
  ...EMPTY_SCOPE,
  question_type: "MULTIPLE_CHOICE",
  difficulty: "NHAN_BIET",
  content: "",
  options: blankOptions(),
  correct_index: "",
  sample_answer: "",
  explanation: "",
  hint: "",
  status: "APPROVED",
  is_active: true,
};

/** `options` của API là JSON tự do -> mảng đúng 4 chuỗi */
export function normalizeOptions(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map((o) => (o == null ? "" : String(o))) : [];
  return [...list, ...blankOptions()].slice(0, OPTION_COUNT);
}

export function toQuestionValues(item: QuestionItem): QuestionFormValues {
  const isChoice = item.question_type === "MULTIPLE_CHOICE";
  const options = isChoice ? normalizeOptions(item.options) : blankOptions();
  const index = isChoice ? options.indexOf(item.correct_answer) : -1;
  return {
    grade: fromGrade(item.grade),
    school_class: item.school_class,
    topic: item.topic,
    question_type: item.question_type,
    difficulty: item.difficulty,
    content: item.content,
    options,
    correct_index: index >= 0 ? String(index) : "",
    sample_answer: isChoice ? "" : item.correct_answer,
    explanation: item.explanation ?? "",
    hint: item.hint ?? "",
    status: item.status,
    is_active: item.is_active,
  };
}

/** Form -> payload: trắc nghiệm gửi 4 phương án + `correct_answer` = chữ của phương án đúng; tự luận gửi `options: null` */
export function buildQuestionPayload(values: QuestionFormValues): QuestionCreateInput {
  const isChoice = values.question_type === "MULTIPLE_CHOICE";
  const options = isChoice ? values.options.map((o) => o.trim()) : null;
  const correct = isChoice ? (options?.[Number(values.correct_index)] ?? "") : values.sample_answer.trim();
  return {
    ...scopePayload(values),
    question_type: values.question_type,
    difficulty: values.difficulty,
    content: values.content.trim(),
    options,
    correct_answer: correct,
    explanation: values.explanation.trim() || null,
    hint: values.hint.trim() || null,
    status: values.status,
    is_active: values.is_active,
  };
}

/** Các phương án đã nhập có trùng nhau không (bỏ qua ô trống) */
export function hasDuplicateOptions(options: string[]): boolean {
  const filled = options.map((o) => o.trim()).filter(Boolean);
  return new Set(filled).size !== filled.length;
}

const pick = <T extends string>(list: readonly T[], value: string, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);

/** Câu nháp AI -> payload tạo mới (khối / chủ đề lấy từ yêu cầu, trạng thái Đã duyệt vì giáo viên đã chọn) */
export function draftToPayload(draft: QuestionDraft, scope: { grade: string | null; topic: string }): QuestionCreateInput {
  const questionType = pick(QUESTION_TYPES, draft.question_type, draft.options?.length ? "MULTIPLE_CHOICE" : "ESSAY");
  return {
    grade: toGradePayload(scope.grade),
    topic: scope.topic.trim(),
    question_type: questionType,
    difficulty: pick(DIFFICULTIES, draft.difficulty, "NHAN_BIET"),
    content: draft.content,
    options: questionType === "MULTIPLE_CHOICE" ? draft.options : null,
    correct_answer: draft.correct_answer,
    explanation: draft.explanation,
    hint: draft.hint,
    status: "APPROVED",
    is_active: true,
  };
}
