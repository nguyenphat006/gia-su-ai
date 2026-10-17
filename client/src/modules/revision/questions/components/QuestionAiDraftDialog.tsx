"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { statusOptions } from "@/components/common/StatusBadge";
import { useConfirm } from "@/components/feedback/confirm";
import { ComboboxField, FormSection, NumberField, SelectField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { ScopeFields } from "../../shared/ScopeFields";
import { toGradePayload } from "../../shared/scope";
import { useQuestionAiDraftMutation, useSaveQuestionDraftsMutation } from "../hooks/useQuestionsQuery";
import { draftToPayload } from "../questionPayload";
import { DIFFICULTY, QUESTION_TYPE } from "../questionStatus";
import type { Difficulty, QuestionDraft, QuestionType } from "../types";
import { QuestionDraftCard } from "./QuestionDraftCard";

interface AiRequestValues {
  grade: string | null;
  school_class: number | null;
  topic: string;
  count: number;
  question_type: QuestionType;
  difficulties: Difficulty[];
}

const DEFAULT_REQUEST: AiRequestValues = { grade: null, school_class: null, topic: "", count: 5, question_type: "MULTIPLE_CHOICE", difficulties: [] };
const COUNT_MIN = 1;
const COUNT_MAX = 20;

interface QuestionAiDraftDialogProps {
  open: boolean;
  onClose: () => void;
}

/** AI soạn nháp: nhập yêu cầu → AI trả các câu (không lưu) → chọn câu → lưu từng câu (Đã duyệt) vào ngân hàng. */
export function QuestionAiDraftDialog({ open, onClose }: QuestionAiDraftDialogProps) {
  const t = useTranslations("questions");
  const tv = useTranslations("revision");
  const tc = useTranslations("common");
  const tval = useTranslations("validation");
  const tr = useTranslations();
  const confirm = useConfirm();
  const form = useForm<AiRequestValues>({ defaultValues: DEFAULT_REQUEST });
  const draftMutation = useQuestionAiDraftMutation();
  const saveMutation = useSaveQuestionDraftsMutation();
  const typeOptions = useMemo(() => statusOptions(QUESTION_TYPE, tr), [tr]);
  const difficultyOptions = useMemo(() => statusOptions(DIFFICULTY, tr), [tr]);

  const [drafts, setDrafts] = useState<QuestionDraft[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  /** Yêu cầu đã gửi AI: khối / lớp / chủ đề gắn vào các câu khi lưu */
  const [scope, setScope] = useState<Pick<AiRequestValues, "grade" | "school_class" | "topic">>(DEFAULT_REQUEST);
  const busy = draftMutation.isPending || saveMutation.isPending;
  const countRange = t("aiDraft.countRange", { min: COUNT_MIN, max: COUNT_MAX });

  const resetAll = () => {
    setDrafts(null);
    setSelected(new Set());
    form.reset(DEFAULT_REQUEST);
  };

  const requestClose = async () => {
    if (busy) return;
    if (drafts?.length) {
      const ok = await confirm({ title: t("aiDraft.discardTitle"), description: t("aiDraft.discardDescription"), confirmText: tc("actions.confirm"), danger: true });
      if (!ok) return;
    }
    resetAll();
    onClose();
  };

  const generate = form.handleSubmit(async (values) => {
    try {
      const result = await draftMutation.mutateAsync({
        grade: toGradePayload(values.grade),
        topic: values.topic.trim(),
        count: Number(values.count),
        question_type: values.question_type,
        difficulties: values.difficulties,
      });
      setScope({ grade: values.grade, school_class: values.school_class, topic: values.topic });
      setDrafts(result);
      setSelected(new Set(result.map((_, i) => i)));
    } catch (error) {
      // 503 (AI chưa cấu hình / quá tải), 429 (vượt giới hạn) -> hiện thông điệp server
      toast.error(extractErrorMessage(error, tv("aiDraft.failed")));
    }
  });

  const toggle = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const save = async () => {
    if (!drafts || selected.size === 0) {
      toast.error(t("aiDraft.noneSelected"));
      return;
    }
    const chosen = drafts.filter((_, i) => selected.has(i));
    const result = await saveMutation.mutateAsync(chosen.map((d) => ({ ...draftToPayload(d, scope), school_class: scope.school_class ?? null })));
    if (result.failedIndexes.length) {
      toast.warning(
        t("aiDraft.partialSaved", {
          saved: result.saved,
          failed: result.failedIndexes.length,
          message: extractErrorMessage(result.firstError, tc("messages.saveError")),
        }),
      );
      // Chỉ giữ lại các câu lưu lỗi để giáo viên xem / thử lại
      const remaining = result.failedIndexes.map((i) => chosen[i]);
      setDrafts(remaining);
      setSelected(new Set(remaining.map((_, i) => i)));
      return;
    }
    toast.success(t("aiDraft.saved", { count: result.saved }));
    resetAll();
    onClose();
  };

  const renderBody = () => {
    if (draftMutation.isPending) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="status" aria-live="polite">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">{tv("aiDraft.generating")}</p>
        </div>
      );
    }
    if (drafts) {
      if (!drafts.length) return <p className="py-12 text-center text-sm text-muted-foreground">{t("aiDraft.empty")}</p>;
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("aiDraft.selected", { count: selected.size, total: drafts.length })}</p>
          {drafts.map((draft, i) => (
            <QuestionDraftCard key={i} index={i} draft={draft} selected={selected.has(i)} onToggle={() => toggle(i)} />
          ))}
        </div>
      );
    }
    return (
      <FormProvider {...form}>
        <form onSubmit={generate} noValidate>
          <FormSection>
            <ScopeFields<AiRequestValues> gradeRequired />
            <NumberField<AiRequestValues>
              name="count"
              label={t("aiDraft.count")}
              min={COUNT_MIN}
              max={COUNT_MAX}
              hint={countRange}
              rules={{
                required: tval("required", { field: t("aiDraft.count") }),
                min: { value: COUNT_MIN, message: countRange },
                max: { value: COUNT_MAX, message: countRange },
              }}
            />
            <SelectField<AiRequestValues> name="question_type" label={t("fields.questionType")} options={typeOptions} />
            <ComboboxField<AiRequestValues>
              name="difficulties"
              label={t("aiDraft.difficulties")}
              options={difficultyOptions}
              multiple
              allowClear
              placeholder={t("aiDraft.difficultiesPlaceholder")}
              className="form-section__full"
            />
          </FormSection>
        </form>
      </FormProvider>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && requestClose()}>
      <DialogContent className="flex max-h-[calc(100vh-80px)] flex-col gap-0 p-0 sm:max-w-[880px]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t("aiDraft.title")}</DialogTitle>
          <DialogDescription>{t("aiDraft.description")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{renderBody()}</div>
        <DialogFooter className="border-t px-6 py-3">
          {drafts && !draftMutation.isPending ? (
            <>
              <Button type="button" variant="ghost" className="sm:mr-auto" onClick={() => setDrafts(null)} disabled={busy}>
                <ArrowLeft />
                {t("aiDraft.back")}
              </Button>
              <Button type="button" variant="outline" onClick={() => generate()} disabled={busy}>
                <Sparkles />
                {t("aiDraft.regenerate")}
              </Button>
              <Button type="button" onClick={save} disabled={busy || selected.size === 0}>
                {saveMutation.isPending && <Loader2 className="animate-spin" />}
                {t("aiDraft.saveSelected")}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={requestClose} disabled={busy}>
                {tc("actions.cancel")}
              </Button>
              <Button type="button" onClick={() => generate()} disabled={busy}>
                {draftMutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {t("aiDraft.generate")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
