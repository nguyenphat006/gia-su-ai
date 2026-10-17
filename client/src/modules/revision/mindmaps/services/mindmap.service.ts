import { http } from "@/lib/api/axiosClient";
import { createCrudService } from "@/lib/api/crud";
import { AI_DRAFT_TIMEOUT } from "../../questions/services/question.service";
import type { AiDraftInput, MindmapCreateInput, MindmapDraft, MindmapFilters, MindmapItem, MindmapUpdateInput } from "../types";

const RESOURCE = "/mindmaps/";

/** CRUD + statistics + batch chuẩn cho `/mindmaps/` + AI soạn nháp (không lưu). */
export const mindmapService = {
  ...createCrudService<MindmapItem, MindmapCreateInput, MindmapUpdateInput, MindmapFilters>(RESOURCE),
  aiDraft: (data: Pick<AiDraftInput, "topic" | "grade">) => http.post<MindmapDraft>(`${RESOURCE}ai-draft/`, data, { timeout: AI_DRAFT_TIMEOUT }),
};
