"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { ListPage, defineColumns, useExcelExport, useListState } from "@/components/list";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { activeColumn, gradeColumn, originColumn, shorten, updatedAtColumn, useStandardBulkActions } from "../shared/listHelpers";
import { QuestionAiDraftDialog } from "./components/QuestionAiDraftDialog";
import { QuestionFormModal } from "./components/QuestionFormModal";
import {
  useBatchDeleteQuestionsMutation,
  useBatchStatusQuestionsMutation,
  useCreateQuestionMutation,
  useDeleteQuestionMutation,
  useQuestionsList,
  useUpdateQuestionMutation,
} from "./hooks/useQuestionsQuery";
import { DIFFICULTY, QUESTION_STATUS, QUESTION_TYPE } from "./questionStatus";
import type { QuestionCreateInput, QuestionItem } from "./types";

/**
 * Ngân hàng câu hỏi — khung ListPage. Câu sinh từ tài liệu ở trạng thái Chờ duyệt (duyệt ở tab Tài liệu nguồn hoặc sửa từng câu).
 * Chữ hiển thị: messages/<vi|en>/questions.json + revision.json.
 */
export function QuestionsView() {
  const t = useTranslations("questions");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const ta = useTranslations("academics");
  const tv = useTranslations("revision");
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useQuestionsList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionItem | null>(null);

  const createMutation = useCreateQuestionMutation();
  const updateMutation = useUpdateQuestionMutation();
  const deleteMutation = useDeleteQuestionMutation();
  const batchDelete = useBatchDeleteQuestionsMutation();
  const batchStatus = useBatchStatusQuestionsMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/questions/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(() => {
    const tx = { tr, tc, ta, tv };
    return defineColumns<QuestionItem>([
      { key: "content", title: t("fields.content"), width: 340, pinned: "left", hideable: false, ellipsis: true, filter: { type: "text" } },
      gradeColumn<QuestionItem>(tx),
      { key: "topic", title: tv("fields.topic"), width: 180, sortable: true, ellipsis: true, filter: { type: "text" } },
      {
        key: "question_type",
        title: t("fields.questionType"),
        width: 130,
        filter: { type: "select", options: statusOptions(QUESTION_TYPE, tr) },
        render: (v) => <StatusBadge map={QUESTION_TYPE} value={v} />,
      },
      {
        key: "difficulty",
        title: t("fields.difficulty"),
        width: 130,
        sortable: true,
        filter: { type: "select", options: statusOptions(DIFFICULTY, tr) },
        render: (v) => <StatusBadge map={DIFFICULTY} value={v} />,
      },
      {
        key: "status",
        title: t("fields.status"),
        width: 130,
        sortable: true,
        filter: { type: "select", options: statusOptions(QUESTION_STATUS, tr) },
        render: (v) => <StatusBadge map={QUESTION_STATUS} value={v} />,
      },
      originColumn<QuestionItem>(tx),
      { key: "school_class_name", title: tv("fields.schoolClass"), width: 140, defaultHidden: true, render: (v: string) => v || tc("status.empty") },
      { key: "source_document_title", title: t("fields.sourceDocument"), width: 200, ellipsis: true, defaultHidden: true, render: (v: string) => v || tc("status.empty") },
      activeColumn<QuestionItem>(tx),
      updatedAtColumn<QuestionItem>(tx),
    ]);
  }, [t, tc, tr, ta, tv]);

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: QuestionCreateInput) => {
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
    canUpdate: can(PERMISSIONS.QUESTION.UPDATE),
    canDelete: can(PERMISSIONS.QUESTION.DELETE),
    entity: t("entity"),
    batchStatus: batchStatus.mutateAsync,
    batchDelete: batchDelete.mutateAsync,
  });
  const canCreate = can(PERMISSIONS.QUESTION.CREATE);

  return (
    <ListPage<QuestionItem>
      moduleCode="QUESTION"
      tableKey="questions-table"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      headerExtra={
        canCreate && (
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles />
            {tv("aiDraft.button")}
          </Button>
        )
      }
      onCreate={canCreate ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.QUESTION.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.QUESTION.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: t("entity") }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: shorten(r.content) }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.QUESTION.EXPORT) ? openExport : undefined}
    >
      <QuestionFormModal open={formOpen} editing={editing} onCancel={() => setFormOpen(false)} onSubmit={handleSubmit} />
      {canCreate && <QuestionAiDraftDialog open={aiOpen} onClose={() => setAiOpen(false)} />}
      {exportModal}
    </ListPage>
  );
}

export default QuestionsView;
