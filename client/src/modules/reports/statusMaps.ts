import { defineStatusMap } from "@/components/common/StatusBadge";

/** Badge / options bộ lọc của báo cáo; nhãn là khóa chữ đầy đủ, dịch lúc render */
export const BLOCKED_STATUS = defineStatusMap({
  true: { label: "reports.chat.status.blocked", tone: "error" },
  false: { label: "reports.chat.status.normal", tone: "neutral" },
});

export const ARENA_MODE = defineStatusMap({
  PVP: { label: "reports.arena.modes.PVP", tone: "info" },
  AI: { label: "reports.arena.modes.AI", tone: "accent" },
});

export const MATCH_STATUS = defineStatusMap({
  IN_PROGRESS: { label: "reports.arena.statuses.IN_PROGRESS", tone: "info" },
  FINISHED: { label: "reports.arena.statuses.FINISHED", tone: "success" },
  ABANDONED: { label: "reports.arena.statuses.ABANDONED", tone: "neutral" },
});

export const QUIZ_TYPE = defineStatusMap({
  CHINH_PHUC: { label: "reports.quiz.types.CHINH_PHUC", tone: "info" },
  FLASHCARD_QUIZ: { label: "reports.quiz.types.FLASHCARD_QUIZ", tone: "accent" },
});

export const EVENT_TYPES = ["LOGIN", "CHAT", "QUIZ", "FLASHCARD_VIEW", "MINDMAP_VIEW", "ARENA"] as const;
