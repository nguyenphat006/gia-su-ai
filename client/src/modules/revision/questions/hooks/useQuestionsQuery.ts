"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { questionService } from "../services/question.service";
import type { QuestionCreateInput } from "../types";

export const QUESTIONS_QUERY_KEY = ["questions"] as const;

const hooks = createCrudHooks(QUESTIONS_QUERY_KEY, questionService);

export const questionQueryKeys = hooks.keys;
export const useQuestionsList = hooks.useList;
export const useQuestionDetail = hooks.useDetail;
export const useCreateQuestionMutation = hooks.useCreate;
export const useUpdateQuestionMutation = hooks.useUpdate;
export const useDeleteQuestionMutation = hooks.useDelete;
export const useBatchDeleteQuestionsMutation = hooks.useBatchDelete;
export const useBatchStatusQuestionsMutation = hooks.useBatchStatus;

/** AI soạn nháp câu hỏi (không ghi CSDL -> không invalidate) */
export function useQuestionAiDraftMutation() {
  return useMutation({ mutationFn: questionService.aiDraft });
}

export interface SaveDraftsResult {
  saved: number;
  /** Vị trí (trong mảng gửi lên) các câu lưu lỗi */
  failedIndexes: number[];
  firstError: unknown;
}

/** Lưu các câu nháp đã chọn (mỗi câu một POST), trả số câu lưu được + lỗi; luôn làm mới danh sách */
export function useSaveQuestionDraftsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payloads: QuestionCreateInput[]): Promise<SaveDraftsResult> => {
      const results = await Promise.allSettled(payloads.map((p) => questionService.create(p)));
      const failedIndexes = results.flatMap((r, i) => (r.status === "rejected" ? [i] : []));
      const firstFailure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      return { saved: results.length - failedIndexes.length, failedIndexes, firstError: firstFailure?.reason };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY }),
  });
}
