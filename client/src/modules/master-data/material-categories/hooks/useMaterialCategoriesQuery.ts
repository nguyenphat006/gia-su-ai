"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { materialCategoryService } from "../services/materialCategory.service";

export const MATERIAL_CATEGORIES_QUERY_KEY = ["material-categories"] as const;
// Lồng dưới key gốc để mọi mutation CRUD cũng làm mới cây phân cấp
export const MATERIAL_CATEGORY_TREE_KEY = [...MATERIAL_CATEGORIES_QUERY_KEY, "tree"] as const;

const categoryHooks = createCrudHooks(MATERIAL_CATEGORIES_QUERY_KEY, materialCategoryService);

export const materialCategoryQueryKeys = categoryHooks.keys;
export const useMaterialCategoriesList = categoryHooks.useList;
export const useMaterialCategoryStats = categoryHooks.useStatistics;
export const useCreateMaterialCategoryMutation = categoryHooks.useCreate;
export const useUpdateMaterialCategoryMutation = categoryHooks.useUpdate;
export const useDeleteMaterialCategoryMutation = categoryHooks.useDelete;
export const useBatchDeleteMaterialCategoriesMutation = categoryHooks.useBatchDelete;
export const useBatchStatusMaterialCategoriesMutation = categoryHooks.useBatchStatus;

/** Cây danh mục Nhóm NVL */
export function useMaterialCategoryTree(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: MATERIAL_CATEGORY_TREE_KEY,
    queryFn: () => materialCategoryService.getTree(),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

/** Di chuyển thứ tự hiển thị lên / xuống */
export function useMoveMaterialCategoryOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: "up" | "down" }) =>
      materialCategoryService.moveOrder(id, direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MATERIAL_CATEGORIES_QUERY_KEY }),
  });
}
