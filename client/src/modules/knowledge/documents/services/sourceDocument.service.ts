import { http } from "@/lib/api/axiosClient";
import { createCrudService } from "@/lib/api/crud";
import type {
  ReviewAction,
  ReviewQuestionsResult,
  SourceDocumentDetail,
  SourceDocumentFilters,
  SourceDocumentItem,
  SourceDocumentUpdateInput,
  SourceDocumentUploadInput,
} from "../types";

const RESOURCE = "/source-documents/";
/** Tệp tới 50MB -> nới thời gian chờ tải lên */
const UPLOAD_TIMEOUT = 300_000;

/**
 * Tài liệu nguồn: không có POST thường (405) — tạo qua `upload/` (multipart, xử lý nền).
 * Chi tiết trả thêm `raw_text`.
 */
export const sourceDocumentService = {
  ...createCrudService<SourceDocumentItem, never, SourceDocumentUpdateInput, SourceDocumentFilters>(RESOURCE),
  getDetail: (id: number) => http.get<SourceDocumentDetail>(`${RESOURCE}${id}/`),
  upload: ({ file, title, grade, topic, generate_questions }: SourceDocumentUploadInput) => {
    const body = new FormData();
    body.append("file", file);
    if (title) body.append("title", title);
    if (grade) body.append("grade", String(grade));
    if (topic) body.append("topic", topic);
    body.append("generate_questions", String(generate_questions));
    return http.post<SourceDocumentItem>(`${RESOURCE}upload/`, body, { headers: { "Content-Type": "multipart/form-data" }, timeout: UPLOAD_TIMEOUT });
  },
  reviewQuestions: (id: number, action: ReviewAction) => http.post<ReviewQuestionsResult>(`${RESOURCE}${id}/review-questions/`, { action }),
};
