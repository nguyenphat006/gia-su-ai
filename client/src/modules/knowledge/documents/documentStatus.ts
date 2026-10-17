import { defineStatusMap } from "@/components/common/StatusBadge";
import type { DocumentStatus } from "./types";

/** Trạng thái xử lý tài liệu — badge + options bộ lọc */
export const DOCUMENT_STATUS = defineStatusMap<DocumentStatus>({
  PROCESSING: { label: "sourceDocuments.status.PROCESSING", tone: "info" },
  COMPLETED: { label: "sourceDocuments.status.COMPLETED", tone: "success" },
  FAILED: { label: "sourceDocuments.status.FAILED", tone: "error" },
});
