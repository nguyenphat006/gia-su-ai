import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu sinh từ OpenAPI (serializer backend) — chạy `npm run gen:api` khi backend đổi. */
export type KnowledgeChunkItem = Schemas["KnowledgeChunk"];
export type KnowledgeChunkCreateInput = Schemas["KnowledgeChunkCreateUpdateRequest"];
export type KnowledgeChunkUpdateInput = KnowledgeChunkCreateInput;

export interface KnowledgeChunkFilters {
  search?: string;
  is_active?: boolean;
  grade?: number;
  page?: number;
  page_size?: number;
  ordering?: string;
}
