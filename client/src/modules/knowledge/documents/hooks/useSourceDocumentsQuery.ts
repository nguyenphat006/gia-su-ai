"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { QUESTIONS_QUERY_KEY } from "@/modules/revision/questions/hooks/useQuestionsQuery";
import { KNOWLEDGE_CHUNKS_QUERY_KEY } from "../../chunks/hooks/useKnowledgeChunksQuery";
import { sourceDocumentService } from "../services/sourceDocument.service";
import type { ReviewAction, SourceDocumentFilters } from "../types";

export const SOURCE_DOCUMENTS_QUERY_KEY = ["source-documents"] as const;
/** Chu kỳ làm mới khi còn tài liệu đang xử lý (quy chuẩn polling >= 15s) */
export const PROCESSING_POLL_MS = 15_000;

const hooks = createCrudHooks(SOURCE_DOCUMENTS_QUERY_KEY, sourceDocumentService);

export const sourceDocumentQueryKeys = hooks.keys;
export const useUpdateSourceDocumentMutation = hooks.useUpdate;
export const useBatchStatusSourceDocumentsMutation = hooks.useBatchStatus;

/** Danh sách; tự làm mới mỗi 15s khi trang hiện tại còn tài liệu PROCESSING, dừng khi tab trình duyệt ẩn */
export function useSourceDocumentsList(params?: SourceDocumentFilters) {
  return useQuery({
    queryKey: hooks.keys.list(params),
    queryFn: () => sourceDocumentService.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.results.some((d) => d.status === "PROCESSING") ? PROCESSING_POLL_MS : false),
    refetchIntervalInBackground: false,
  });
}

/** Chi tiết (kèm văn bản trích xuất) — chỉ gọi khi mở ngăn chi tiết; theo dõi tiếp khi đang xử lý */
export function useSourceDocumentDetail(id: number | null) {
  return useQuery({
    queryKey: hooks.keys.detail(id ?? 0),
    queryFn: () => sourceDocumentService.getDetail(id as number),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === "PROCESSING" ? PROCESSING_POLL_MS : false),
    refetchIntervalInBackground: false,
  });
}

export function useUploadSourceDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sourceDocumentService.upload,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SOURCE_DOCUMENTS_QUERY_KEY }),
  });
}

/** Duyệt / loại các câu chờ duyệt của tài liệu -> làm mới tài liệu + ngân hàng câu hỏi */
export function useReviewQuestionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: ReviewAction }) => sourceDocumentService.reviewQuestions(id, action),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: SOURCE_DOCUMENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY }),
      ]),
  });
}

/** Xóa tài liệu = xóa mềm cả các đoạn tri thức của nó -> làm mới cả tab đoạn */
function useInvalidateDocumentsAndChunks() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: SOURCE_DOCUMENTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: KNOWLEDGE_CHUNKS_QUERY_KEY }),
    ]);
}

export function useDeleteSourceDocumentMutation() {
  const invalidate = useInvalidateDocumentsAndChunks();
  return useMutation({ mutationFn: (id: number) => sourceDocumentService.remove(id), onSuccess: invalidate });
}

export function useBatchDeleteSourceDocumentsMutation() {
  const invalidate = useInvalidateDocumentsAndChunks();
  return useMutation({ mutationFn: (ids: number[]) => sourceDocumentService.batchDelete(ids), onSuccess: invalidate });
}
