"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { CodeText, ListPage, RelativeTime, defineColumns, useExcelExport, useListState, type BulkAction } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { SchoolClassFormModal } from "./components/SchoolClassFormModal";
import {
  useBatchDeleteSchoolClassesMutation,
  useBatchStatusSchoolClassesMutation,
  useCreateSchoolClassMutation,
  useDeleteSchoolClassMutation,
  useSchoolClassesList,
  useUpdateSchoolClassMutation,
} from "./hooks/useSchoolClassesQuery";
import { gradeOptions } from "../shared/grades";
import type { SchoolClassCreateInput, SchoolClassItem, SchoolClassUpdateInput } from "./types";

/**
 * Trang danh sách lớp học — khung ListPage (docs/plan/ui-list-detail-design.md).
 * Thêm cột / bộ lọc: sửa `columns`; bộ lọc cột cần lookup tương ứng trong `filterset_fields` ở backend.
 * Cần trang chi tiết: tạo SchoolClassDetailView bằng <DetailPage> và thêm `link` cho cột tên.
 * Chữ hiển thị: messages/<vi|en>/schoolClasses.json (rule frontend-i18n.md).
 */
export function SchoolClassesView() {
  const t = useTranslations("schoolClasses");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const ta = useTranslations("academics");
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useSchoolClassesList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClassItem | null>(null);

  const createMutation = useCreateSchoolClassMutation();
  const updateMutation = useUpdateSchoolClassMutation();
  const deleteMutation = useDeleteSchoolClassMutation();
  const batchDelete = useBatchDeleteSchoolClassesMutation();
  const batchStatus = useBatchStatusSchoolClassesMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/classes/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(
    () =>
      defineColumns<SchoolClassItem>([
        { key: "code", title: t("fields.code"), width: 130, pinned: "left", hideable: false, sortable: true, filter: { type: "text" }, render: (v) => <CodeText>{v}</CodeText> },
        { key: "name", title: t("fields.name"), width: 180, sortable: true, filter: { type: "text" } },
        {
          key: "grade",
          title: ta("gradeLabel"),
          width: 110,
          sortable: true,
          filter: { type: "select", options: gradeOptions(ta) },
          render: (v: number) => ta("grade", { grade: v }),
        },
        { key: "academic_year", title: ta("academicYear"), width: 130, sortable: true, filter: { type: "text", param: "academic_year" } },
        { key: "homeroom_teacher_name", title: t("fields.homeroomTeacher"), width: 200, ellipsis: true, render: (v: string) => v || tc("status.empty") },
        { key: "student_count", title: t("fields.studentCount"), width: 100, align: "right", sortable: true },
        { key: "description", title: tc("fields.description"), width: 240, ellipsis: true, defaultHidden: true },
        {
          key: "is_active",
          title: tc("fields.status"),
          width: 130,
          filter: { type: "select", options: statusOptions(ACTIVE_STATUS, tr) },
          render: (v) => <StatusBadge map={ACTIVE_STATUS} value={v} />,
        },
        {
          key: "updated_at",
          title: tc("fields.updatedAt"),
          width: 140,
          sortable: true,
          filter: { type: "date" },
          render: (v, r) => <RelativeTime value={v} by={r.updated_by_name} />,
        },
      ]),
    [t, tc, tr, ta],
  );

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: SchoolClassCreateInput | SchoolClassUpdateInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values as SchoolClassUpdateInput });
      toast.success(tc("messages.updated", { entity: t("entity") }));
    } else {
      await createMutation.mutateAsync(values as SchoolClassCreateInput);
      toast.success(tc("messages.created", { entity: t("entity") }));
    }
    setFormOpen(false);
  };

  const showBatchResult = (res: { message: string; data: { skipped?: unknown[] } }) =>
    res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message);

  const bulkActions: BulkAction[] = [
    ...(can(PERMISSIONS.CLASS.UPDATE)
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: false })) },
        ]
      : []),
    ...(can(PERMISSIONS.CLASS.DELETE)
      ? [
          {
            key: "delete",
            label: tc("actions.delete"),
            icon: <Trash2 />,
            danger: true,
            confirm: {
              title: (n: number) => tc("messages.bulkDeleteTitle", { count: n, entity: t("entity") }),
              content: tc("messages.deleteIrreversible"),
              okText: tc("actions.delete"),
            },
            onClick: async (ids: number[]) => showBatchResult(await batchDelete.mutateAsync(ids)),
          },
        ]
      : []),
  ];

  return (
    <ListPage<SchoolClassItem>
      moduleCode="CLASS"
      tableKey="school-classes-table"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.CLASS.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.CLASS.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.CLASS.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: t("entity") }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.name }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.CLASS.EXPORT) ? openExport : undefined}
    >
      <SchoolClassFormModal
        open={formOpen}
        editing={editing}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
      {exportModal}
    </ListPage>
  );
}

export default SchoolClassesView;
