"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ListPage, defineColumns, useExcelExport, useListState } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { activeColumn, gradeColumn, originColumn, updatedAtColumn, useStandardBulkActions } from "../shared/listHelpers";
import { FlashcardDeckFormModal } from "./components/FlashcardDeckFormModal";
import {
  useBatchDeleteFlashcardDecksMutation,
  useBatchStatusFlashcardDecksMutation,
  useCreateFlashcardDeckMutation,
  useDeleteFlashcardDeckMutation,
  useFlashcardDecksList,
  useUpdateFlashcardDeckMutation,
} from "./hooks/useFlashcardDecksQuery";
import type { FlashcardDeckCreateInput, FlashcardDeckItem } from "./types";

/**
 * Bộ flashcard ôn tập — khung ListPage; form có nút "AI soạn nháp" điền sẵn tiêu đề + thẻ.
 * Chữ hiển thị: messages/<vi|en>/flashcardDecks.json + revision.json.
 */
export function FlashcardDecksView() {
  const t = useTranslations("flashcardDecks");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const ta = useTranslations("academics");
  const tv = useTranslations("revision");
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useFlashcardDecksList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FlashcardDeckItem | null>(null);

  const createMutation = useCreateFlashcardDeckMutation();
  const updateMutation = useUpdateFlashcardDeckMutation();
  const deleteMutation = useDeleteFlashcardDeckMutation();
  const batchDelete = useBatchDeleteFlashcardDecksMutation();
  const batchStatus = useBatchStatusFlashcardDecksMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/flashcard-decks/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(() => {
    const tx = { tr, tc, ta, tv };
    return defineColumns<FlashcardDeckItem>([
      { key: "title", title: t("fields.title"), width: 240, pinned: "left", hideable: false, sortable: true, ellipsis: true, filter: { type: "text" } },
      gradeColumn<FlashcardDeckItem>(tx),
      { key: "topic", title: tv("fields.topic"), width: 200, sortable: true, ellipsis: true, filter: { type: "text" } },
      { key: "card_count", title: t("fields.cardCount"), width: 90, align: "right" },
      originColumn<FlashcardDeckItem>(tx),
      { key: "school_class_name", title: tv("fields.schoolClass"), width: 140, defaultHidden: true, render: (v: string) => v || tc("status.empty") },
      activeColumn<FlashcardDeckItem>(tx),
      updatedAtColumn<FlashcardDeckItem>(tx),
    ]);
  }, [t, tc, tr, ta, tv]);

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: FlashcardDeckCreateInput) => {
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
    canUpdate: can(PERMISSIONS.FLASHCARD.UPDATE),
    canDelete: can(PERMISSIONS.FLASHCARD.DELETE),
    entity: t("entity"),
    batchStatus: batchStatus.mutateAsync,
    batchDelete: batchDelete.mutateAsync,
  });

  return (
    <ListPage<FlashcardDeckItem>
      moduleCode="FLASHCARD"
      tableKey="flashcard-decks-table"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.FLASHCARD.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.FLASHCARD.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.FLASHCARD.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: t("entity") }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.title }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.FLASHCARD.EXPORT) ? openExport : undefined}
    >
      <FlashcardDeckFormModal
        open={formOpen}
        editing={editing}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        canUseAi={can(PERMISSIONS.FLASHCARD.CREATE)}
      />
      {exportModal}
    </ListPage>
  );
}

export default FlashcardDecksView;
