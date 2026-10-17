"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { CodeText, ListPage, RelativeTime, defineColumns, useExcelExport, useListState, type BulkAction } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { SupplierFormModal } from "./components/SupplierFormModal";
import {
  useBatchDeleteSuppliersMutation,
  useBatchStatusSuppliersMutation,
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useSuppliersList,
  useUpdateSupplierMutation,
} from "./hooks/useSuppliersQuery";
import type { SupplierCreateInput, SupplierItem, SupplierUpdateInput } from "./types";

/**
 * Trang danh sách nhà cung cấp — khung ListPage (docs/plan/ui-list-detail-design.md).
 * Thêm cột / bộ lọc: sửa `columns`; bộ lọc cột cần lookup tương ứng trong `filterset_fields` ở backend.
 * Cần trang chi tiết: tạo SupplierDetailView bằng <DetailPage> và thêm `link` cho cột tên.
 * Chữ hiển thị: messages/<vi|en>/suppliers.json (rule frontend-i18n.md).
 */
export function SuppliersView() {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useSuppliersList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierItem | null>(null);

  const createMutation = useCreateSupplierMutation();
  const updateMutation = useUpdateSupplierMutation();
  const deleteMutation = useDeleteSupplierMutation();
  const batchDelete = useBatchDeleteSuppliersMutation();
  const batchStatus = useBatchStatusSuppliersMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/suppliers/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(
    () =>
      defineColumns<SupplierItem>([
        {
          key: "supplier_code",
          title: t("fields.code"),
          width: 140,
          pinned: "left",
          hideable: false,
          sortable: true,
          filter: { type: "text" },
          render: (v) => <CodeText>{v}</CodeText>,
        },
        { key: "supplier_name", title: t("fields.name"), width: 260, sortable: true, ellipsis: true, filter: { type: "text" } },
        { key: "tax_code", title: t("fields.taxCode"), width: 140, filter: { type: "text" } },
        { key: "phone", title: t("fields.phone"), width: 140, filter: { type: "text" } },
        { key: "email", title: t("fields.email"), width: 200, ellipsis: true, filter: { type: "text" } },
        { key: "address", title: t("fields.address"), width: 260, ellipsis: true, defaultHidden: true },
        { key: "description", title: tc("fields.description"), width: 280, ellipsis: true, defaultHidden: true },
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
          render: (v, r) => <RelativeTime value={v} by={r.updated_by_name || r.created_by_name} />,
        },
      ]),
    [t, tc, tr],
  );

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: SupplierCreateInput | SupplierUpdateInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values as SupplierUpdateInput });
      toast.success(tc("messages.updated", { entity: `"${values.supplier_name}"` }));
    } else {
      await createMutation.mutateAsync(values as SupplierCreateInput);
      toast.success(tc("messages.created", { entity: `"${values.supplier_name}"` }));
    }
    setFormOpen(false);
  };

  const showBatchResult = (res: { message: string; data: { skipped?: unknown[] } }) =>
    res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message);

  const bulkActions: BulkAction[] = [
    ...(can(PERMISSIONS.SUPPLIER.UPDATE)
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: false })) },
        ]
      : []),
    ...(can(PERMISSIONS.SUPPLIER.DELETE)
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
    <ListPage<SupplierItem>
      moduleCode="SUPPLIER"
      tableKey="suppliers"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.SUPPLIER.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.SUPPLIER.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.SUPPLIER.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: `"${r.supplier_name}"` }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.supplier_name }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.SUPPLIER.EXPORT) ? openExport : undefined}
    >
      <SupplierFormModal
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

export default SuppliersView;
