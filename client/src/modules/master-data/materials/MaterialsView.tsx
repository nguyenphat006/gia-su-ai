"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import {
  CodeText,
  ListPage,
  RelativeTime,
  defineColumns,
  remoteSource,
  useExcelExport,
  useListState,
  type BulkAction,
  type FilterTreeNode,
} from "@/components/list";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { MaterialFormModal } from "./components/MaterialFormModal";
import { PROFILE_SHAPE_OPTIONS } from "./components/material-form/metalSpecUtils";
import { formatMaterialSpec } from "./utils";
import { useMaterialHero } from "./hero";
import {
  useMaterialDetail,
  useMaterialsList,
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useDeleteMaterialMutation,
  useBatchDeleteMaterialsMutation,
  useBatchUpdateMaterialStatusMutation,
} from "./hooks/useMaterialsQuery";
import { useMaterialCategoryTree } from "../material-categories/hooks/useMaterialCategoriesQuery";
import { unitService } from "../units/services/unit.service";
import type { MaterialCategoryTreeItem } from "../material-categories/types";
import type { MaterialItem, MaterialFormValues } from "./types";

function toFilterTree(nodes: MaterialCategoryTreeItem[]): FilterTreeNode[] {
  return nodes.map((n) => ({ title: n.name, value: n.id, children: n.children?.length ? toFilterTree(n.children) : undefined }));
}

export function MaterialsView() {
  const t = useTranslations("materials");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const materialHero = useMaterialHero();
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useMaterialsList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialItem | null>(null);

  // Cây nhóm dùng chung cho bộ lọc và form (nhỏ, có cache); ĐVT trong form tìm ở server khi mở ô chọn
  const { data: categoryTree = [] } = useMaterialCategoryTree();

  const createMutation = useCreateMaterialMutation();
  const updateMutation = useUpdateMaterialMutation();
  const deleteMutation = useDeleteMaterialMutation();
  const batchDelete = useBatchDeleteMaterialsMutation();
  const batchStatus = useBatchUpdateMaterialStatusMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/materials/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(
    () =>
      defineColumns<MaterialItem>([
        {
          key: "image_url",
          title: t("fields.image"),
          width: 72,
          render: (v, r) =>
            v ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v} alt={r.material_name} className="list-thumb" loading="lazy" />
            ) : (
              <span className="list-thumb list-thumb--empty" aria-hidden />
            ),
        },
        {
          key: "material_code",
          title: tc("fields.code"),
          width: 120,
          pinned: "left",
          hideable: false,
          sortable: true,
          filter: { type: "text" },
          render: (v) => <CodeText>{v}</CodeText>,
        },
        {
          key: "material_name",
          title: t("fields.name"),
          width: 260,
          sortable: true,
          ellipsis: true,
          filter: { type: "text" },
          link: (r) => `/master-data/materials/${r.id}`,
        },
        { key: "category", title: t("fields.category"), width: 180, ellipsis: true, filter: { type: "tree", treeData: toFilterTree(categoryTree) }, render: (_, r) => r.category_name },
        {
          key: "base_uom",
          title: t("fields.uomShort"),
          width: 100,
          filter: {
            type: "remote",
            source: remoteSource({
              queryKey: ["units"],
              fetchPage: (p) => unitService.list(p),
              toOption: (u) => ({ value: String(u.id), label: u.name, code: u.code }),
            }),
          },
          render: (_, r) => r.base_uom_name,
        },
        {
          key: "spec",
          title: t("fields.spec"),
          width: 150,
          filterField: "metal_spec__profile_shape",
          filter: { type: "select", options: PROFILE_SHAPE_OPTIONS.map((o) => ({ value: o.value, label: tr(o.label) })) },
          render: (_, r) => formatMaterialSpec(r),
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
          width: 150,
          sortable: true,
          filter: { type: "date" },
          render: (v, r) => <RelativeTime value={v} by={r.updated_by_name ?? r.created_by_name} />,
        },
        { key: "description", title: tc("fields.description"), width: 260, ellipsis: true, defaultHidden: true },
      ]),
    [categoryTree, t, tc, tr],
  );

  const handleSubmit = async (values: MaterialFormValues) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values });
      toast.success(tc("messages.updated", { entity: `"${values.material_name}"` }));
    } else {
      await createMutation.mutateAsync(values);
      toast.success(tc("messages.created", { entity: `"${values.material_name}"` }));
    }
    setFormOpen(false);
  };

  const showBatchResult = (res: { message: string; data: { skipped?: unknown[] } }) =>
    res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message);

  const bulkActions: BulkAction[] = [
    ...(can(PERMISSIONS.MATERIAL.UPDATE)
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: false })) },
        ]
      : []),
    ...(can(PERMISSIONS.MATERIAL.DELETE)
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
    <ListPage<MaterialItem>
      moduleCode="MATERIAL"
      tableKey="materials"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.MATERIAL.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.MATERIAL.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.MATERIAL.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: `"${r.material_name}"` }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.material_name }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.MATERIAL.EXPORT) ? openExport : undefined}
      quickView={{ useDetail: useMaterialDetail, hero: materialHero, href: (id) => `/master-data/materials/${id}` }}
    >
      <MaterialFormModal
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        initialData={editing}
        categoryTree={categoryTree}
      />
      {exportModal}
    </ListPage>
  );
}

export default MaterialsView;
