import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu sinh từ OpenAPI (serializer backend) — chạy `npm run gen:api` khi backend đổi. */
export type QuestionItem = Schemas["Question"];
export type QuestionCreateInput = Schemas["QuestionCreateUpdateRequest"];
export type QuestionUpdateInput = QuestionCreateInput;
export type QuestionType = Schemas["QuestionTypeEnum"];
export type Difficulty = Schemas["DifficultyEnum"];
export type QuestionStatus = Schemas["QuestionStatusEnum"];
export type QuestionDraft = Schemas["QuestionDraft"];
export type QuestionAiDraftInput = Schemas["AiDraftRequestRequest"];

export interface QuestionFilters {
  search?: string;
  is_active?: boolean;
  grade?: number;
  question_type?: QuestionType;
  difficulty?: Difficulty;
  status?: QuestionStatus;
  origin?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}
