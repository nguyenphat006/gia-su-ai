"use client";

import { useMutation } from "@tanstack/react-query";
import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { mindmapService } from "../services/mindmap.service";

export const MINDMAPS_QUERY_KEY = ["mindmaps"] as const;

const hooks = createCrudHooks(MINDMAPS_QUERY_KEY, mindmapService);

export const mindmapQueryKeys = hooks.keys;
export const useMindmapsList = hooks.useList;
export const useMindmapDetail = hooks.useDetail;
export const useCreateMindmapMutation = hooks.useCreate;
export const useUpdateMindmapMutation = hooks.useUpdate;
export const useDeleteMindmapMutation = hooks.useDelete;
export const useBatchDeleteMindmapsMutation = hooks.useBatchDelete;
export const useBatchStatusMindmapsMutation = hooks.useBatchStatus;

/** AI soạn nháp sơ đồ (không ghi CSDL -> không invalidate) */
export function useMindmapAiDraftMutation() {
  return useMutation({ mutationFn: mindmapService.aiDraft });
}
