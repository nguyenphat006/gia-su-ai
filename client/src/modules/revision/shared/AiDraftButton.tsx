"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { toGradePayload } from "./scope";
import type { Grade } from "@/modules/academics/shared/grades";

interface AiDraftButtonProps<D> {
  /** Khối / chủ đề đang nhập trong form */
  getScope: () => { grade: string | null; topic: string };
  /** Form đã có nội dung -> hỏi trước khi thay */
  hasContent: () => boolean;
  /** Gọi API ai-draft */
  request: (input: { topic: string; grade: Grade | null }) => Promise<D>;
  /** Điền bản nháp vào form */
  apply: (draft: D) => void;
  /** Đánh dấu lỗi ở ô khối / chủ đề khi thiếu */
  onMissingScope?: () => void;
  pending: boolean;
  disabled?: boolean;
}

/** Nút "AI soạn nháp" trong form flashcard / sơ đồ tư duy: cần chủ đề + khối, xác nhận nếu sẽ ghi đè nội dung. */
export function AiDraftButton<D>({ getScope, hasContent, request, apply, onMissingScope, pending, disabled }: AiDraftButtonProps<D>) {
  const t = useTranslations("revision");
  const tc = useTranslations("common");
  const confirm = useConfirm();

  const run = async () => {
    const { grade, topic } = getScope();
    if (!grade || !topic.trim()) {
      onMissingScope?.();
      toast.error(t("aiDraft.needTopicGrade"));
      return;
    }
    if (hasContent()) {
      const ok = await confirm({ title: t("aiDraft.replaceTitle"), description: t("aiDraft.replaceDescription"), confirmText: tc("actions.confirm") });
      if (!ok) return;
    }
    try {
      const draft = await request({ topic: topic.trim(), grade: toGradePayload(grade) });
      apply(draft);
      toast.success(t("aiDraft.filled"));
    } catch (error) {
      // 503 / 429: thông điệp server (AI chưa cấu hình, quá tải, vượt giới hạn)
      toast.error(extractErrorMessage(error, t("aiDraft.failed")));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" onClick={run} disabled={pending || disabled}>
        {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {t("aiDraft.button")}
      </Button>
      {pending && (
        <span className="hidden text-xs text-muted-foreground sm:inline" role="status" aria-live="polite">
          {t("aiDraft.generating")}
        </span>
      )}
    </div>
  );
}
