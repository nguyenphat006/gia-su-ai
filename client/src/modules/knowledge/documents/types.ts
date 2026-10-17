import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu sinh từ OpenAPI (serializer backend) — chạy `npm run gen:api` khi backend đổi. */
export type SourceDocumentItem = Schemas["SourceDocument"];
export type SourceDocumentDetail = Schemas["SourceDocumentDetail"];
export type SourceDocumentUpdateInput = Schemas["SourceDocumentUpdateRequest"];
export type DocumentStatus = Schemas["DocumentStatusEnum"];
export type ReviewAction = Schemas["ActionEnum"];

/** Body multipart của `/source-documents/upload/` (`file` là File thật, schema ghi dạng binary string) */
export interface SourceDocumentUploadInput {
  file: File;
  title?: string;
  grade?: number | null;
  topic?: string;
  generate_questions: boolean;
}

/** Kết quả thật của review-questions (schema OpenAPI ghi nhầm là SourceDocument) */
export interface ReviewQuestionsResult {
  count: number;
}

export interface SourceDocumentFilters {
  search?: string;
  is_active?: boolean;
  grade?: number;
  status?: DocumentStatus;
  page?: number;
  page_size?: number;
  ordering?: string;
}
