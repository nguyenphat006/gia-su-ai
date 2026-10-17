import { createCrudService } from "@/lib/api/crud";
import type { KnowledgeChunkCreateInput, KnowledgeChunkFilters, KnowledgeChunkItem, KnowledgeChunkUpdateInput } from "../types";

/** CRUD + statistics + batch actions chuẩn cho `/knowledge-chunks/` (BaseERPViewSet). Endpoint riêng: thêm bằng http.get/post. */
export const knowledgeChunkService = createCrudService<
  KnowledgeChunkItem,
  KnowledgeChunkCreateInput,
  KnowledgeChunkUpdateInput,
  KnowledgeChunkFilters
>("/knowledge-chunks/");
