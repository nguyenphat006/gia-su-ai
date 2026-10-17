"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, defineStatusMap, statusOptions } from "@/components/common/StatusBadge";
import { CodeText, ListPage, RelativeTime, defineColumns, remoteSource, useExcelExport, useListState, type BulkAction } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { InitialPasswordDialog, type InitialCredential } from "../shared/InitialPasswordDialog";
import { schoolClassSource } from "../shared/entitySources";
import { gradeOptions } from "../shared/grades";
import { StudentFormModal } from "./components/StudentFormModal";
import { StudentImportDialog } from "./components/StudentImportDialog";
import {
  useBatchDeleteStudentsMutation,
  useBatchStatusStudentsMutation,
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useStudentsList,
  useUpdateStudentMutation,
} from "./hooks/useStudentsQuery";
import type { StudentCreateInput, StudentItem, StudentUpdateInput } from "./types";

const PASSWORD_STATUS = defineStatusMap({ true: { label: "academics.mustChangePassword", tone: "warning" } });

/**
 * Trang danh sách học sinh — mỗi học sinh là 1 tài khoản đăng nhập (vai trò STUDENT) + hồ sơ.
 * Tạo mới không nhập mật khẩu -> server sinh mật khẩu ban đầu (hiện một lần); nhập hàng loạt qua StudentImportDialog.
 */
export function StudentsView() {
  const t = useTranslations("students");
  const ta = useTranslations("academics");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useStudentsList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<StudentItem | null>(null);
  const [credential, setCredential] = useState<InitialCredential | null>(null);

  const createMutation = useCreateStudentMutation();
  const updateMutation = useUpdateStudentMutation();
  const deleteMutation = useDeleteStudentMutation();
  const batchDelete = useBatchDeleteStudentsMutation();
  const batchStatus = useBatchStatusStudentsMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/students/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(
    () =>
      defineColumns<StudentItem>([
        {
          key: "student_code",
          title: t("fields.studentCode"),
          width: 130,
          pinned: "left",
          hideable: false,
          sortable: true,
          filter: { type: "text" },
          render: (v) => <CodeText>{v}</CodeText>,
        },
        { key: "full_name", title: ta("fields.fullName"), width: 200, sortable: "user__full_name", filter: { type: "text" }, filterField: "user__full_name" },
        { key: "username", title: ta("fields.username"), width: 140, filter: { type: "text" }, filterField: "user__username", render: (v) => <CodeText>{v}</CodeText> },
        { key: "grade", title: ta("gradeLabel"), width: 100, sortable: true, filter: { type: "select", options: gradeOptions(ta) }, render: (v: number) => ta("grade", { grade: v }) },
        {
          key: "school_class_name",
          title: t("fields.schoolClass"),
          width: 130,
          filterField: "school_class",
          filter: { type: "remote", source: remoteSource(schoolClassSource) },
          render: (v: string) => v || tc("status.empty"),
        },
        { key: "last_login", title: ta("fields.lastLogin"), width: 150, sortable: "user__last_login", render: (v) => <RelativeTime value={v} /> },
        {
          key: "must_change_password",
          title: ta("fields.password"),
          width: 160,
          render: (v: boolean) => (v ? <StatusBadge map={PASSWORD_STATUS} value="true" /> : null),
        },
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
  const handleSubmit = async (values: StudentCreateInput | StudentUpdateInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values as StudentUpdateInput });
      toast.success(tc("messages.updated", { entity: t("entity") }));
    } else {
      const created = await createMutation.mutateAsync(values as StudentCreateInput);
      toast.success(tc("messages.created", { entity: t("entity") }));
      if (created.initial_password) setCredential({ username: created.username, password: created.initial_password });
    }
    setFormOpen(false);
  };

  const showBatchResult = (res: { message: string; data: { skipped?: unknown[] } }) =>
    res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message);

  const bulkActions: BulkAction[] = [
    ...(can(PERMISSIONS.STUDENT.UPDATE)
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: false })) },
        ]
      : []),
    ...(can(PERMISSIONS.STUDENT.DELETE)
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
    <ListPage<StudentItem>
      moduleCode="STUDENT"
      tableKey="students-table"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.STUDENT.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.STUDENT.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.STUDENT.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: t("entity") }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.full_name }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.STUDENT.EXPORT) ? openExport : undefined}
      onImport={can(PERMISSIONS.STUDENT.IMPORT) ? () => setImportOpen(true) : undefined}
    >
      <StudentFormModal
        open={formOpen}
        editing={editing}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
      <StudentImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <InitialPasswordDialog credential={credential} onClose={() => setCredential(null)} />
      {exportModal}
    </ListPage>
  );
}

export default StudentsView;
