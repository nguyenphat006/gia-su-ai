"use client";

import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { unitService } from "../services/unit.service";

export const UNITS_QUERY_KEY = ["units"] as const;

const unitHooks = createCrudHooks(UNITS_QUERY_KEY, unitService);

export const unitQueryKeys = unitHooks.keys;
export const useUnitsList = unitHooks.useList;
export const useUnitDetail = unitHooks.useDetail;
export const useUnitStats = unitHooks.useStatistics;
export const useCreateUnitMutation = unitHooks.useCreate;
export const useUpdateUnitMutation = unitHooks.useUpdate;
export const useDeleteUnitMutation = unitHooks.useDelete;
export const useBatchDeleteUnitsMutation = unitHooks.useBatchDelete;
export const useBatchStatusUnitsMutation = unitHooks.useBatchStatus;
