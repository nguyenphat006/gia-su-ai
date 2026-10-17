"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ListPage, defineColumns, useExcelExport, useListState } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { activeColumn, gradeColumn, originColumn, updatedAtColumn, useStandardBulkActions } from "../shared/listHelpers";
import { MindmapFormModal } from "./components/MindmapFormModal";
import {
  useBatchDeleteMindmapsMutation,
  useBatchStatusMindmapsMutation,
  useCreateMindmapMutation,
  useDeleteMindmapMutation,
  useMindmapsList,
  useUpdateMindmapMutation,
} from "./hooks/useMindmapsQuery";
import type { MindmapCreateInput, MindmapItem } from "./types";

/**
 * Sơ đồ tư duy ôn tập — khung ListPage; form sửa nút dạng cây, nút "AI soạn nháp" điền sẵn tiêu đề + nút.
 * Chữ hiển thị: messages/<vi|en>/mindmaps.json + revision.json.
 */
export function MindmapsView() {
  const t = useTranslations("mindmaps");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const ta = useTranslations("academics");
  const tv = useTranslations("revision");
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useMindmapsList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MindmapItem | null>(null);

  const createMutation = useCreateMindmapMutation();
  const updateMutation = useUpdateMindmapMutation();
  const deleteMutation = useDeleteMindmapMutation();
  const batchDelete = useBatchDeleteMindmapsMutation();
  const batchStatus = useBatchStatusMindmapsMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/mindmaps/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(() => {
    const tx = { tr, tc, ta, tv };
    return defineColumns<MindmapItem>([
      { key: "title", title: t("fields.title"), width: 240, pinned: "left", hideable: false, sortable: true, ellipsis: true, filter: { type: "text" } },
      gradeColumn<MindmapItem>(tx),
      { key: "topic", title: tv("fields.topic"), width: 200, sortable: true, ellipsis: true, filter: { type: "text" } },
      { key: "node_count", title: t("fields.nodeCount"), width: 90, align: "right" },
      originColumn<MindmapItem>(tx),
      { key: "school_class_name", title: tv("fields.schoolClass"), width: 140, defaultHidden: true, render: (v: string) => v || tc("status.empty") },
      activeColumn<MindmapItem>(tx),
      updatedAtColumn<MindmapItem>(tx),
    ]);
  }, [t, tc, tr, ta, tv]);

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: MindmapCreateInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values });
      toast.success(tc("messages.updated", { entity: t("entity") }));
    } else {
      await createMutation.mutateAsync(values);
      toast.success(tc("messages.created", { entity: t("entity") }));
    }
    setFormOpen(false);
  };

  const bulkActions = useStandardBulkActions({
    canUpdate: can(PERMISSIONS.MINDMAP.UPDATE),
    canDelete: can(PERMISSIONS.MINDMAP.DELETE),
    entity: t("entity"),
    batchStatus: batchStatus.mutateAsync,
    batchDelete: batchDelete.mutateAsync,
  });

  return (
    <ListPage<MindmapItem>
      moduleCode="MINDMAP"
      tableKey="mindmaps-table"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.MINDMAP.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.MINDMAP.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.MINDMAP.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: t("entity") }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.title }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.MINDMAP.EXPORT) ? openExport : undefined}
    >
      <MindmapFormModal
        open={formOpen}
        editing={editing}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        canUseAi={can(PERMISSIONS.MINDMAP.CREATE)}
      />
      {exportModal}
    </ListPage>
  );
}

export default MindmapsView;
