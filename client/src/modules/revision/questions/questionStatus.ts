import { defineStatusMap } from "@/components/common/StatusBadge";
import type { Difficulty, QuestionStatus, QuestionType } from "./types";

/** Trạng thái duyệt — badge + options bộ lọc */
export const QUESTION_STATUS = defineStatusMap<QuestionStatus>({
  PENDING: { label: "questions.status.PENDING", tone: "warning" },
  APPROVED: { label: "questions.status.APPROVED", tone: "success" },
  REJECTED: { label: "questions.status.REJECTED", tone: "error" },
});

export const QUESTION_TYPE = defineStatusMap<QuestionType>({
  MULTIPLE_CHOICE: { label: "questions.questionType.MULTIPLE_CHOICE", tone: "info" },
  ESSAY: { label: "questions.questionType.ESSAY", tone: "accent" },
});

export const DIFFICULTY = defineStatusMap<Difficulty>({
  NHAN_BIET: { label: "questions.difficulty.NHAN_BIET", tone: "success" },
  THONG_HIEU: { label: "questions.difficulty.THONG_HIEU", tone: "info" },
  VAN_DUNG: { label: "questions.difficulty.VAN_DUNG", tone: "warning" },
});
