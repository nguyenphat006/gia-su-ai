"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCheck, Pencil, XCircle } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge } from "@/components/common/StatusBadge";
import { useConfirm } from "@/components/feedback/confirm";
import { RelativeTime } from "@/components/list";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { DOCUMENT_STATUS } from "../documentStatus";
import { useReviewQuestionsMutation, useSourceDocumentDetail } from "../hooks/useSourceDocumentsQuery";
import type { ReviewAction, SourceDocumentDetail, SourceDocumentItem } from "../types";

interface SourceDocumentDrawerProps {
  id: number | null;
  onClose: () => void;
  /** Có quyền KNOWLEDGE_UPDATE: sửa thông tin + duyệt / loại câu hỏi */
  canUpdate: boolean;
  onEdit: (doc: SourceDocumentItem) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detail-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function DrawerBody({ doc, canUpdate, onEdit }: { doc: SourceDocumentDetail; canUpdate: boolean; onEdit: (doc: SourceDocumentItem) => void }) {
  const t = useTranslations("sourceDocuments");
  const tr = useTranslations("revision");
  const ta = useTranslations("academics");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const review = useReviewQuestionsMutation();

  const runReview = (action: ReviewAction) =>
    confirm({
      title: action === "APPROVE_ALL" ? t("detail.approveConfirm") : t("detail.rejectConfirm"),
      description: action === "APPROVE_ALL" ? t("detail.approveDescription") : t("detail.rejectDescription"),
      confirmText: action === "APPROVE_ALL" ? t("detail.approveAll") : t("detail.rejectAll"),
      danger: action === "REJECT_ALL",
      onConfirm: async () => {
        try {
          const res = await review.mutateAsync({ id: doc.id, action });
          toast.success(t("detail.reviewed", { count: res.count }));
        } catch (error) {
          toast.error(extractErrorMessage(error, tc("messages.genericError")));
          throw error;
        }
      },
    });

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge map={DOCUMENT_STATUS} value={doc.status} />
        <StatusBadge map={ACTIVE_STATUS} value={doc.is_active} />
      </div>

      {doc.status === "PROCESSING" && (
        <div className="space-y-1.5" role="status" aria-live="polite">
          <Progress value={doc.progress} aria-label={t("fields.progress")} />
          <p className="text-xs text-muted-foreground">{t("detail.processingHint", { processed: doc.processed_chunks, total: doc.total_chunks })}</p>
        </div>
      )}

      {doc.status === "FAILED" && doc.error_message && (
        <div className="rounded-md border border-[var(--c-error)] bg-[var(--c-error-bg)] px-3 py-2 text-sm text-[var(--c-error)]" role="alert">
          <p className="font-medium">{t("fields.errorMessage")}</p>
          <p className="mt-1 whitespace-pre-wrap">{doc.error_message}</p>
        </div>
      )}

      <dl className="quick-view__fields">
        <Field label={tr("fields.grade")}>{doc.grade == null ? tr("sharedGrade") : ta("grade", { grade: doc.grade })}</Field>
        <Field label={tr("fields.topic")}>{doc.topic || tc("status.empty")}</Field>
        <Field label={t("fields.chunkCount")}>{doc.chunk_count}</Field>
        <Field label={t("fields.questionCount")}>{doc.question_count}</Field>
        <Field label={t("fields.generateQuestions")}>{doc.generate_questions ? tc("status.yes") : tc("status.no")}</Field>
        <Field label={tc("fields.createdAt")}>
          <RelativeTime value={doc.created_at} by={doc.created_by_name} />
        </Field>
        {doc.description && <Field label={tc("fields.description")}>{doc.description}</Field>}
      </dl>

      {canUpdate && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(doc)}>
            <Pencil />
            {tc("actions.edit")}
          </Button>
          <Button type="button" size="sm" onClick={() => runReview("APPROVE_ALL")} disabled={!doc.question_count || review.isPending}>
            <CheckCheck />
            {t("detail.approveAll")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => runReview("REJECT_ALL")} disabled={!doc.question_count || review.isPending}>
            <XCircle />
            {t("detail.rejectAll")}
          </Button>
        </div>
      )}

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">{t("fields.rawText")}</h3>
        {doc.raw_text ? (
          <pre className="max-h-[50vh] overflow-auto rounded-md border bg-[var(--c-bg-subtle)] p-3 font-sans text-sm whitespace-pre-wrap text-foreground">{doc.raw_text}</pre>
        ) : (
          <p className="text-sm text-muted-foreground">{t("detail.noText")}</p>
        )}
      </section>
    </div>
  );
}

/** Ngăn chi tiết tài liệu: thông tin, lỗi xử lý, văn bản trích xuất + duyệt / loại hàng loạt câu hỏi AI sinh */
export function SourceDocumentDrawer({ id, onClose, canUpdate, onEdit }: SourceDocumentDrawerProps) {
  const t = useTranslations("sourceDocuments");
  const tc = useTranslations("common");
  const { data, isLoading, isError, refetch } = useSourceDocumentDetail(id);

  return (
    <Sheet open={id !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-[560px]">
        <SheetHeader className="border-b">
          <SheetTitle className="pr-6">{data?.title ?? t("detail.title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("detail.title")}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pt-4">
          {isLoading ? (
            <div className="space-y-3 px-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : isError || !data ? (
            <div className="space-y-3 px-4 text-sm text-muted-foreground">
              <p>{t("detail.loadError")}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                {tc("actions.retry")}
              </Button>
            </div>
          ) : (
            <DrawerBody doc={data} canUpdate={canUpdate} onEdit={onEdit} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
