"use client";

import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { aiSettingService } from "../services/aiSetting.service";

export const AI_SETTINGS_QUERY_KEY = ["ai-settings"] as const;

const hooks = createCrudHooks(AI_SETTINGS_QUERY_KEY, aiSettingService);

export const aiSettingQueryKeys = hooks.keys;
export const useAiSettingsList = hooks.useList;
export const useAiSettingDetail = hooks.useDetail;
export const useCreateAiSettingMutation = hooks.useCreate;
export const useUpdateAiSettingMutation = hooks.useUpdate;
export const useDeleteAiSettingMutation = hooks.useDelete;
export const useBatchDeleteAiSettingsMutation = hooks.useBatchDelete;
export const useBatchStatusAiSettingsMutation = hooks.useBatchStatus;
