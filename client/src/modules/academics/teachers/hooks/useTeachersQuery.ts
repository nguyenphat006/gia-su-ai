"use client";

import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { teacherService } from "../services/teacher.service";

export const TEACHERS_QUERY_KEY = ["teachers"] as const;

const hooks = createCrudHooks(TEACHERS_QUERY_KEY, teacherService);

export const teacherQueryKeys = hooks.keys;
export const useTeachersList = hooks.useList;
export const useTeacherDetail = hooks.useDetail;
export const useCreateTeacherMutation = hooks.useCreate;
export const useUpdateTeacherMutation = hooks.useUpdate;
export const useDeleteTeacherMutation = hooks.useDelete;
export const useBatchDeleteTeachersMutation = hooks.useBatchDelete;
export const useBatchStatusTeachersMutation = hooks.useBatchStatus;
