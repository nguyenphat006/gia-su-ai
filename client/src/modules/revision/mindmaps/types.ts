import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu sinh từ OpenAPI (serializer backend) — chạy `npm run gen:api` khi backend đổi. */
export type MindmapItem = Schemas["Mindmap"];
export type MindmapCreateInput = Schemas["MindmapCreateUpdateRequest"];
export type MindmapUpdateInput = MindmapCreateInput;
export type MindmapDraft = Schemas["MindmapDraft"];
export type AiDraftInput = Schemas["AiDraftRequestRequest"];

export interface MindmapFilters {
  search?: string;
  is_active?: boolean;
  grade?: number;
  origin?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}
