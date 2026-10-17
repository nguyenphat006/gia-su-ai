import { http } from "@/lib/api/axiosClient";
import { createCrudService } from "@/lib/api/crud";
import type { QuestionAiDraftInput, QuestionCreateInput, QuestionDraft, QuestionFilters, QuestionItem, QuestionUpdateInput } from "../types";

const RESOURCE = "/questions/";
/** AI soạn nháp mất 10–30 giây -> nới thời gian chờ mặc định (30s) */
export const AI_DRAFT_TIMEOUT = 120_000;

/** CRUD + statistics + batch chuẩn cho `/questions/` (BaseERPViewSet) + AI soạn nháp (không lưu). */
export const questionService = {
  ...createCrudService<QuestionItem, QuestionCreateInput, QuestionUpdateInput, QuestionFilters>(RESOURCE),
  /** Trả mảng câu nháp (schema OpenAPI ghi nhầm là danh sách phân trang — xem báo cáo API) */
  aiDraft: (data: QuestionAiDraftInput) => http.post<QuestionDraft[]>(`${RESOURCE}ai-draft/`, data, { timeout: AI_DRAFT_TIMEOUT }),
};
