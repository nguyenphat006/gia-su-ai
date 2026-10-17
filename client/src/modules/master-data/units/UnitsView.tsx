"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { CodeText, ListPage, RelativeTime, defineColumns, useExcelExport, useListState, type BulkAction } from "@/components/list";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { UnitFormModal } from "./components/UnitFormModal";
import {
  useUnitsList,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  useBatchDeleteUnitsMutation,
  useBatchStatusUnitsMutation,
} from "./hooks/useUnitsQuery";
import type { UnitOfMeasureItem, UnitCreateInput, UnitUpdateInput } from "./types";

export function UnitsView() {
  const t = useTranslations("units");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useUnitsList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UnitOfMeasureItem | null>(null);

  const createMutation = useCreateUnitMutation();
  const updateMutation = useUpdateUnitMutation();
  const deleteMutation = useDeleteUnitMutation();
  const batchDelete = useBatchDeleteUnitsMutation();
  const batchStatus = useBatchStatusUnitsMutation();
  const { openExport, exportModal } = useExcelExport({
    endpoint: "/units/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(
    () =>
      defineColumns<UnitOfMeasureItem>([
        { key: "code", title: tc("fields.code"), width: 120, pinned: "left", hideable: false, sortable: true, filter: { type: "text" }, render: (v) => <CodeText>{v}</CodeText> },
        { key: "name", title: t("fields.name"), width: 220, sortable: true, filter: { type: "text" } },
        { key: "description", title: tc("fields.description"), width: 280, ellipsis: true },
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
          width: 150,
          sortable: true,
          filter: { type: "date" },
          render: (v, r) => <RelativeTime value={v} by={r.updated_by_name ?? r.created_by_name} />,
        },
        { key: "created_by_name", title: tc("fields.createdBy"), width: 160, defaultHidden: true },
      ]),
    [t, tc, tr],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (unit: UnitOfMeasureItem) => {
    setEditing(unit);
    setFormOpen(true);
  };

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: UnitCreateInput | UnitUpdateInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values as UnitUpdateInput });
      toast.success(tc("messages.updated", { entity: `${t("entity")} "${editing.code}"` }));
    } else {
      await createMutation.mutateAsync(values as UnitCreateInput);
      toast.success(tc("messages.created", { entity: t("entity") }));
    }
    setFormOpen(false);
  };

  const showBatchResult = (res: { message: string; data: { skipped?: unknown[] } }) =>
    res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message);

  const bulkActions: BulkAction[] = [
    ...(can(PERMISSIONS.UNIT.UPDATE)
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: false })) },
        ]
      : []),
    ...(can(PERMISSIONS.UNIT.DELETE)
      ? [
          {
            key: "delete",
            label: tc("actions.delete"),
            icon: <Trash2 />,
            danger: true,
            confirm: {
              title: (n: number) => tc("messages.bulkDeleteTitle", { count: n, entity: t("entity") }),
              content: `${t("bulkDeleteHint")} ${tc("messages.deleteIrreversible")}`,
              okText: tc("actions.delete"),
            },
            onClick: async (ids: number[]) => showBatchResult(await batchDelete.mutateAsync(ids)),
          },
        ]
      : []),
  ];

  return (
    <ListPage<UnitOfMeasureItem>
      moduleCode="UNIT"
      tableKey="units"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.UNIT.CREATE) ? openCreate : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.UNIT.UPDATE) ? openEdit : undefined,
        onDelete: can(PERMISSIONS.UNIT.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: `${t("entity")} "${r.code}"` }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.name }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.UNIT.EXPORT) ? openExport : undefined}
    >
      <UnitFormModal
        open={formOpen}
        editingUnit={editing}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
      {exportModal}
    </ListPage>
  );
}

export default UnitsView;
