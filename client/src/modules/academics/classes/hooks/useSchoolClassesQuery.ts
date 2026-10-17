"use client";

import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { schoolClassService } from "../services/schoolClass.service";

export const SCHOOL_CLASSES_QUERY_KEY = ["school-classes"] as const;

const hooks = createCrudHooks(SCHOOL_CLASSES_QUERY_KEY, schoolClassService);

export const schoolClassQueryKeys = hooks.keys;
export const useSchoolClassesList = hooks.useList;
export const useSchoolClassDetail = hooks.useDetail;
export const useCreateSchoolClassMutation = hooks.useCreate;
export const useUpdateSchoolClassMutation = hooks.useUpdate;
export const useDeleteSchoolClassMutation = hooks.useDelete;
export const useBatchDeleteSchoolClassesMutation = hooks.useBatchDelete;
export const useBatchStatusSchoolClassesMutation = hooks.useBatchStatus;
