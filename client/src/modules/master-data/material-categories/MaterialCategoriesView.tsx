"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { CodeText, ListPage, RelativeTime, defineColumns, useExcelExport, useListState, type BulkAction } from "@/components/list";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { MaterialCategoryFormModal } from "./components/MaterialCategoryFormModal";
import {
  useMaterialCategoriesList,
  useMaterialCategoryTree,
  useCreateMaterialCategoryMutation,
  useUpdateMaterialCategoryMutation,
  useDeleteMaterialCategoryMutation,
  useBatchDeleteMaterialCategoriesMutation,
  useBatchStatusMaterialCategoriesMutation,
  useMoveMaterialCategoryOrderMutation,
} from "./hooks/useMaterialCategoriesQuery";
import type { MaterialCategoryItem, MaterialCategoryCreateInput, MaterialCategoryUpdateInput } from "./types";

export function MaterialCategoriesView() {
  const t = useTranslations("materialCategories");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const { can } = usePermission();
  // Không truyền ordering mặc định: backend tự sắp theo cây (nhóm gốc → nhóm con)
  const list = useListState({ defaultPageSize: 50 });
  const query = useMaterialCategoriesList(list.params);
  const { data: categoryTree = [] } = useMaterialCategoryTree();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialCategoryItem | null>(null);

  const createMutation = useCreateMaterialCategoryMutation();
  const updateMutation = useUpdateMaterialCategoryMutation();
  const deleteMutation = useDeleteMaterialCategoryMutation();
  const batchDelete = useBatchDeleteMaterialCategoriesMutation();
  const batchStatus = useBatchStatusMaterialCategoriesMutation();
  const moveOrder = useMoveMaterialCategoryOrderMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/material-categories/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const rootOptions = useMemo(() => categoryTree.map((n) => ({ label: n.name, value: n.id })), [categoryTree]);

  const columns = useMemo(
    () =>
      defineColumns<MaterialCategoryItem>([
        { key: "code", title: tc("fields.code"), width: 160, pinned: "left", hideable: false, sortable: true, filter: { type: "text" }, render: (v) => <CodeText>{v}</CodeText> },
        {
          key: "name",
          title: t("fields.name"),
          width: 260,
          sortable: true,
          filter: { type: "text" },
          // Nhóm con thụt lề dưới nhóm cha
          render: (v, r) => (r.parent ? <span className="list-tree-child">{v}</span> : <span style={{ fontWeight: 500 }}>{v}</span>),
        },
        { key: "parent", title: t("fields.parent"), width: 200, ellipsis: true, filter: { type: "multiSelect", options: rootOptions }, render: (_, r) => r.parent_name },
        { key: "children_count", title: t("fields.children"), width: 100, align: "right", render: (v) => v || null },
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
        { key: "description", title: tc("fields.description"), width: 260, ellipsis: true, defaultHidden: true },
      ]),
    [rootOptions, t, tc, tr],
  );

  // Vị trí trong nhóm anh em (để khóa "Lên" / "Xuống" ở đầu / cuối)
  const siblingBounds = useMemo(() => {
    const rows = query.data?.results ?? [];
    const map = new Map<number, { first: boolean; last: boolean }>();
    const groups = new Map<number | null, MaterialCategoryItem[]>();
    rows.forEach((r) => groups.set(r.parent ?? null, [...(groups.get(r.parent ?? null) ?? []), r]));
    groups.forEach((items) => items.forEach((r, i) => map.set(r.id, { first: i === 0, last: i === items.length - 1 })));
    return map;
  }, [query.data]);

  const move = async (r: MaterialCategoryItem, direction: "up" | "down") => {
    await moveOrder.mutateAsync({ id: r.id, direction });
    toast.success(direction === "up" ? t("movedUp", { name: r.name }) : t("movedDown", { name: r.name }));
  };

  const handleSubmit = async (values: MaterialCategoryCreateInput | MaterialCategoryUpdateInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values as MaterialCategoryUpdateInput });
      toast.success(tc("messages.updated", { entity: `${t("entity")} "${editing.code}"` }));
    } else {
      await createMutation.mutateAsync(values as MaterialCategoryCreateInput);
      toast.success(tc("messages.created", { entity: t("entity") }));
    }
    setFormOpen(false);
  };

  const showBatchResult = (res: { message: string; data: { skipped?: unknown[] } }) =>
    res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message);

  const canUpdate = can(PERMISSIONS.MATERIAL_CATEGORY.UPDATE);
  const bulkActions: BulkAction[] = [
    ...(canUpdate
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: false })) },
        ]
      : []),
    ...(can(PERMISSIONS.MATERIAL_CATEGORY.DELETE)
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
    <ListPage<MaterialCategoryItem>
      moduleCode="MATERIAL_CATEGORY"
      tableKey="material-categories"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.MATERIAL_CATEGORY.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: canUpdate ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.MATERIAL_CATEGORY.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: `${t("entity")} "${r.code}"` }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.name }),
        more: canUpdate
          ? (r) => [
              { key: "up", label: t("moveUp"), icon: <ArrowUp />, disabled: siblingBounds.get(r.id)?.first, onClick: () => move(r, "up") },
              { key: "down", label: t("moveDown"), icon: <ArrowDown />, disabled: siblingBounds.get(r.id)?.last, onClick: () => move(r, "down") },
            ]
          : undefined,
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.MATERIAL_CATEGORY.EXPORT) ? openExport : undefined}
    >
      <MaterialCategoryFormModal
        open={formOpen}
        editingCategory={editing}
        categoryTree={categoryTree}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
      {exportModal}
    </ListPage>
  );
}

export default MaterialCategoriesView;
