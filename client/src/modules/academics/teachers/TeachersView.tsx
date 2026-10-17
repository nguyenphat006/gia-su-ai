"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { CodeText, ListPage, RelativeTime, defineColumns, useExcelExport, useListState, type BulkAction } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { InitialPasswordDialog, type InitialCredential } from "../shared/InitialPasswordDialog";
import { TeacherFormModal } from "./components/TeacherFormModal";
import {
  useBatchDeleteTeachersMutation,
  useBatchStatusTeachersMutation,
  useCreateTeacherMutation,
  useDeleteTeacherMutation,
  useTeachersList,
  useUpdateTeacherMutation,
} from "./hooks/useTeachersQuery";
import type { TeacherCreateInput, TeacherItem, TeacherUpdateInput } from "./types";

/**
 * Trang danh sách giáo viên — mỗi giáo viên là 1 tài khoản đăng nhập (vai trò TEACHER) + hồ sơ.
 * Tạo mới không nhập mật khẩu -> server sinh mật khẩu ban đầu, hiện một lần trong InitialPasswordDialog.
 */
export function TeachersView() {
  const t = useTranslations("teachers");
  const ta = useTranslations("academics");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useTeachersList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherItem | null>(null);
  const [credential, setCredential] = useState<InitialCredential | null>(null);

  const createMutation = useCreateTeacherMutation();
  const updateMutation = useUpdateTeacherMutation();
  const deleteMutation = useDeleteTeacherMutation();
  const batchDelete = useBatchDeleteTeachersMutation();
  const batchStatus = useBatchStatusTeachersMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/teachers/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(
    () =>
      defineColumns<TeacherItem>([
        {
          key: "employee_code",
          title: t("fields.employeeCode"),
          width: 130,
          pinned: "left",
          sortable: true,
          filter: { type: "text" },
          render: (v) => (v ? <CodeText>{v}</CodeText> : tc("status.empty")),
        },
        { key: "full_name", title: ta("fields.fullName"), width: 200, hideable: false, sortable: "user__full_name", filter: { type: "text" }, filterField: "user__full_name" },
        { key: "username", title: ta("fields.username"), width: 150, render: (v) => <CodeText>{v}</CodeText> },
        { key: "subject", title: t("fields.subject"), width: 160, filter: { type: "text" } },
        { key: "email", title: ta("fields.email"), width: 200, ellipsis: true },
        { key: "last_login", title: ta("fields.lastLogin"), width: 150, render: (v) => <RelativeTime value={v} /> },
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
          defaultHidden: true,
          filter: { type: "date" },
          render: (v, r) => <RelativeTime value={v} by={r.updated_by_name} />,
        },
      ]),
    [t, ta, tc, tr],
  );

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: TeacherCreateInput | TeacherUpdateInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values as TeacherUpdateInput });
      toast.success(tc("messages.updated", { entity: t("entity") }));
    } else {
      const created = await createMutation.mutateAsync(values as TeacherCreateInput);
      toast.success(tc("messages.created", { entity: t("entity") }));
      if (created.initial_password) setCredential({ username: created.username, password: created.initial_password });
    }
    setFormOpen(false);
  };

  const showBatchResult = (res: { message: string; data: { skipped?: unknown[] } }) =>
    res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message);

  const bulkActions: BulkAction[] = [
    ...(can(PERMISSIONS.TEACHER.UPDATE)
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: false })) },
        ]
      : []),
    ...(can(PERMISSIONS.TEACHER.DELETE)
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
    <ListPage<TeacherItem>
      moduleCode="TEACHER"
      tableKey="teachers-table"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.TEACHER.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.TEACHER.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.TEACHER.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: t("entity") }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.full_name }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.TEACHER.EXPORT) ? openExport : undefined}
    >
      <TeacherFormModal
        open={formOpen}
        editing={editing}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
      <InitialPasswordDialog credential={credential} onClose={() => setCredential(null)} />
      {exportModal}
    </ListPage>
  );
}

export default TeachersView;
