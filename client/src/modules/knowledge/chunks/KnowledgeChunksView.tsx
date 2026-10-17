"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { defineStatusMap, StatusBadge } from "@/components/common/StatusBadge";
import { ListPage, defineColumns, useExcelExport, useListState } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { activeColumn, gradeColumn, updatedAtColumn, useStandardBulkActions } from "@/modules/revision/shared/listHelpers";
import { KnowledgeChunkFormModal } from "./components/KnowledgeChunkFormModal";
import {
  useBatchDeleteKnowledgeChunksMutation,
  useBatchStatusKnowledgeChunksMutation,
  useCreateKnowledgeChunkMutation,
  useDeleteKnowledgeChunkMutation,
  useKnowledgeChunksList,
  useUpdateKnowledgeChunkMutation,
} from "./hooks/useKnowledgeChunksQuery";
import type { KnowledgeChunkCreateInput, KnowledgeChunkItem } from "./types";

const EMBEDDING_STATUS = defineStatusMap({
  true: { label: "knowledgeChunks.embedding.embedded", tone: "success" },
  false: { label: "knowledgeChunks.embedding.pending", tone: "warning" },
});

interface KnowledgeChunksViewProps {
  /** TabsList của trang Tri thức RAG (hiện dưới tiêu đề) */
  headerContent?: React.ReactNode;
}

/**
 * Tab "Đoạn tri thức" của trang Tri thức RAG — đoạn nhập tay hoặc sinh từ tài liệu; sửa nội dung -> nhúng lại vector (chạy nền).
 * Chữ hiển thị: messages/<vi|en>/knowledgeChunks.json.
 */
export function KnowledgeChunksView({ headerContent }: KnowledgeChunksViewProps) {
  const t = useTranslations("knowledgeChunks");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const ta = useTranslations("academics");
  const tv = useTranslations("revision");
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useKnowledgeChunksList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeChunkItem | null>(null);

  const createMutation = useCreateKnowledgeChunkMutation();
  const updateMutation = useUpdateKnowledgeChunkMutation();
  const deleteMutation = useDeleteKnowledgeChunkMutation();
  const batchDelete = useBatchDeleteKnowledgeChunksMutation();
  const batchStatus = useBatchStatusKnowledgeChunksMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/knowledge-chunks/",
    label: t("entity"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(() => {
    const tx = { tr, tc, ta, tv };
    return defineColumns<KnowledgeChunkItem>([
      { key: "title", title: t("fields.title"), width: 260, pinned: "left", hideable: false, sortable: true, ellipsis: true, filter: { type: "text" } },
      gradeColumn<KnowledgeChunkItem>(tx),
      { key: "topic", title: tv("fields.topic"), width: 180, ellipsis: true, filter: { type: "text" }, render: (v: string | null) => v || tc("status.empty") },
      { key: "source_document_title", title: t("fields.sourceDocument"), width: 200, ellipsis: true, render: (v: string) => v || tc("status.empty") },
      { key: "is_embedded", title: t("fields.embedding"), width: 130, render: (v) => <StatusBadge map={EMBEDDING_STATUS} value={v} /> },
      { key: "content", title: t("fields.content"), width: 300, ellipsis: true, defaultHidden: true },
      activeColumn<KnowledgeChunkItem>(tx),
      updatedAtColumn<KnowledgeChunkItem>(tx),
    ]);
  }, [t, tc, tr, ta, tv]);

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: KnowledgeChunkCreateInput) => {
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
    canUpdate: can(PERMISSIONS.KNOWLEDGE.UPDATE),
    canDelete: can(PERMISSIONS.KNOWLEDGE.DELETE),
    entity: t("entity"),
    batchStatus: batchStatus.mutateAsync,
    batchDelete: batchDelete.mutateAsync,
  });

  return (
    <ListPage<KnowledgeChunkItem>
      moduleCode="KNOWLEDGE"
      tableKey="knowledge-chunks-table"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      headerContent={headerContent}
      onCreate={can(PERMISSIONS.KNOWLEDGE.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.KNOWLEDGE.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.KNOWLEDGE.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: t("entity") }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.title }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.KNOWLEDGE.EXPORT) ? openExport : undefined}
    >
      <KnowledgeChunkFormModal open={formOpen} editing={editing} onCancel={() => setFormOpen(false)} onSubmit={handleSubmit} />
      {exportModal}
    </ListPage>
  );
}

export default KnowledgeChunksView;
