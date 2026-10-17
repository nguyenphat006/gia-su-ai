"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCrudHooks } from "@/lib/api/createCrudHooks";
import type { StudentImportInput } from "../types";
import { studentService } from "../services/student.service";

export const STUDENTS_QUERY_KEY = ["students"] as const;

const hooks = createCrudHooks(STUDENTS_QUERY_KEY, studentService);

export const studentQueryKeys = hooks.keys;
export const useStudentsList = hooks.useList;
export const useStudentDetail = hooks.useDetail;
export const useCreateStudentMutation = hooks.useCreate;
export const useUpdateStudentMutation = hooks.useUpdate;
export const useDeleteStudentMutation = hooks.useDelete;
export const useBatchDeleteStudentsMutation = hooks.useBatchDelete;
export const useBatchStatusStudentsMutation = hooks.useBatchStatus;

/** Nhập Excel: làm mới danh sách học sinh + lớp (sĩ số) sau khi nhập */
export function useImportStudentsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentImportInput) => studentService.importExcel(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["school-classes"] });
    },
  });
}
