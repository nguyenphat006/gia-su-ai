"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { ListPage, RelativeTime, defineColumns, useExcelExport, useListState } from "@/components/list";
import { Progress } from "@/components/ui/progress";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { activeColumn, gradeColumn, useStandardBulkActions } from "@/modules/revision/shared/listHelpers";
import { SourceDocumentDrawer } from "./components/SourceDocumentDrawer";
import { SourceDocumentFormModal } from "./components/SourceDocumentFormModal";
import { SourceDocumentUploadDialog } from "./components/SourceDocumentUploadDialog";
import { DOCUMENT_STATUS } from "./documentStatus";
import {
  useBatchDeleteSourceDocumentsMutation,
  useBatchStatusSourceDocumentsMutation,
  useDeleteSourceDocumentMutation,
  useSourceDocumentsList,
  useUpdateSourceDocumentMutation,
} from "./hooks/useSourceDocumentsQuery";
import type { SourceDocumentItem, SourceDocumentUpdateInput } from "./types";

interface SourceDocumentsViewProps {
  /** TabsList của trang Tri thức RAG (hiện dưới tiêu đề) */
  headerContent?: React.ReactNode;
}

/**
 * Tab "Tài liệu nguồn" của trang Tri thức RAG: tải tài liệu (xử lý nền, tự làm mới 15s khi còn tài liệu đang xử lý),
 * xem chi tiết + văn bản trích xuất, duyệt / loại hàng loạt câu hỏi AI sinh từ tài liệu.
 * Chữ hiển thị: messages/<vi|en>/sourceDocuments.json.
 */
export function SourceDocumentsView({ headerContent }: SourceDocumentsViewProps) {
  const t = useTranslations("sourceDocuments");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const ta = useTranslations("academics");
  const tv = useTranslations("revision");
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-created_at" });
  const query = useSourceDocumentsList(list.params);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<SourceDocumentItem | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const updateMutation = useUpdateSourceDocumentMutation();
  const deleteMutation = useDeleteSourceDocumentMutation();
  const batchDelete = useBatchDeleteSourceDocumentsMutation();
  const batchStatus = useBatchStatusSourceDocumentsMutation();
  const canUpdate = can(PERMISSIONS.KNOWLEDGE.UPDATE);

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/source-documents/",
    label: tr("knowledge.tabs.documents"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(() => {
    const tx = { tr, tc, ta, tv };
    return defineColumns<SourceDocumentItem>([
      {
        key: "title",
        title: t("fields.title"),
        width: 260,
        pinned: "left",
        hideable: false,
        sortable: true,
        filter: { type: "text" },
        render: (v: string, r) => (
          <button type="button" className="max-w-full truncate text-left font-medium text-primary hover:underline" onClick={() => setDetailId(r.id)}>
            {v}
          </button>
        ),
      },
      gradeColumn<SourceDocumentItem>(tx, false),
      { key: "topic", title: tv("fields.topic"), width: 160, ellipsis: true, filter: { type: "text" }, render: (v: string | null) => v || tc("status.empty") },
      {
        key: "status",
        title: t("fields.status"),
        width: 130,
        sortable: true,
        filter: { type: "select", options: statusOptions(DOCUMENT_STATUS, tr) },
        render: (v) => <StatusBadge map={DOCUMENT_STATUS} value={v} />,
      },
      {
        key: "progress",
        title: t("fields.progress"),
        width: 140,
        render: (v: number) => (
          <div className="flex items-center gap-2">
            <Progress value={v} className="h-1.5 w-16" aria-label={t("fields.progress")} />
            <span className="text-xs text-muted-foreground tabular-nums">{v}%</span>
          </div>
        ),
      },
      { key: "chunk_count", title: t("fields.chunkCount"), width: 90, align: "right" },
      { key: "question_count", title: t("fields.questionCount"), width: 100, align: "right" },
      activeColumn<SourceDocumentItem>(tx),
      {
        key: "created_at",
        title: tc("fields.createdAt"),
        width: 140,
        sortable: true,
        filter: { type: "date" },
        render: (v, r) => <RelativeTime value={v} by={r.created_by_name} />,
      },
    ]);
  }, [t, tc, tr, ta, tv]);

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleUpdate = async (values: SourceDocumentUpdateInput) => {
    if (!editing) return;
    await updateMutation.mutateAsync({ id: editing.id, data: values });
    toast.success(tc("messages.updated", { entity: t("entity") }));
    setEditing(null);
  };

  const bulkActions = useStandardBulkActions({
    canUpdate,
    canDelete: can(PERMISSIONS.KNOWLEDGE.DELETE),
    entity: t("entity"),
    batchStatus: batchStatus.mutateAsync,
    batchDelete: batchDelete.mutateAsync,
  });

  return (
    <ListPage<SourceDocumentItem>
      moduleCode="KNOWLEDGE"
      tableKey="source-documents-table"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      headerContent={headerContent}
      onCreate={can(PERMISSIONS.KNOWLEDGE.CREATE) ? () => setUploadOpen(true) : undefined}
      createLabel={t("upload.button")}
      rowActions={{
        onEdit: canUpdate ? (r) => setEditing(r) : undefined,
        onDelete: can(PERMISSIONS.KNOWLEDGE.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: t("entity") }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.title }),
        more: (r) => [{ key: "detail", label: tc("actions.viewDetail"), icon: <Eye />, onClick: () => setDetailId(r.id) }],
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.KNOWLEDGE.EXPORT) ? openExport : undefined}
    >
      <SourceDocumentUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <SourceDocumentFormModal open={editing !== null} editing={editing} onCancel={() => setEditing(null)} onSubmit={handleUpdate} />
      <SourceDocumentDrawer id={detailId} onClose={() => setDetailId(null)} canUpdate={canUpdate} onEdit={(doc) => { setDetailId(null); setEditing(doc); }} />
      {exportModal}
    </ListPage>
  );
}

export default SourceDocumentsView;
