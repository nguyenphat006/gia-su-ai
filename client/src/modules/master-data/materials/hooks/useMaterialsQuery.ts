"use client";

import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { materialService } from "../services/material.service";

export const MATERIALS_QUERY_KEY = ["materials"] as const;

const materialHooks = createCrudHooks(MATERIALS_QUERY_KEY, materialService);

export const materialQueryKeys = materialHooks.keys;
export const useMaterialsList = materialHooks.useList;
export const useMaterialDetail = materialHooks.useDetail;
export const useCreateMaterialMutation = materialHooks.useCreate;
export const useUpdateMaterialMutation = materialHooks.useUpdate;
export const useDeleteMaterialMutation = materialHooks.useDelete;
export const useBatchDeleteMaterialsMutation = materialHooks.useBatchDelete;
export const useBatchUpdateMaterialStatusMutation = materialHooks.useBatchStatus;
