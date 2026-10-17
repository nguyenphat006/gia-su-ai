"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, ImagePlus, Lightbulb, Loader2, Send, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { cn } from "@/lib/utils";
import { FormattedContent } from "../../shared/FormattedContent";
import { useDifficultyLabel } from "../../shared/SetupFields";
import { IMAGE_ACCEPT, MAX_IMAGE_MB, validateImageFile } from "../../shared/imageFile";
import type { CheckAnswerResult, PublicQuestion } from "../../shared/types";
import { practiceService } from "../practice.service";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

interface Props {
  question: PublicQuestion;
  checked: { answer: string; result: CheckAnswerResult } | undefined;
  onChecked: (answer: string, result: CheckAnswerResult) => void;
  onNext: () => void;
  isLast: boolean;
  finishing: boolean;
}

/** Một câu hỏi ôn tập: trắc nghiệm (chọn là chấm) hoặc tự luận (gõ / chụp ảnh, AI chấm) */
export function QuizQuestionCard({ question, checked, onChecked, onNext, isLast, finishing }: Props) {
  const t = useTranslations("learnPractice");
  const difficultyLabel = useDifficultyLabel();
  const [showHint, setShowHint] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [essay, setEssay] = useState("");
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEssay = question.question_type === "ESSAY" || !question.options?.length;

  const imageUrl = image?.url;
  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const check = useMutation({
    mutationFn: ({ answer, file }: { answer: string; file: File | null }) => practiceService.checkAnswer(question.id, answer, file),
    onSuccess: (result, { answer }) => onChecked(answer, result),
    onError: (error) => toast.error(extractErrorMessage(error, t("quiz.checkError"))),
  });

  const chooseOption = (opt: string) => {
    if (checked || check.isPending) return;
    setChoice(opt);
    check.mutate({ answer: opt, file: null });
  };

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) return void toast.error(problem === "type" ? t("quiz.imageType") : t("quiz.imageSize", { size: MAX_IMAGE_MB }));
    setImage({ file, url: URL.createObjectURL(file) });
  };

  const result = checked?.result;
  const selected = checked?.answer ?? choice;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-[var(--c-primary-bg)] px-2 py-0.5 font-medium text-[var(--c-primary)]">{t(`questionType.${isEssay ? "ESSAY" : "MULTIPLE_CHOICE"}`)}</span>
          {question.difficulty && <span className="rounded-full bg-[var(--c-bg-muted)] px-2 py-0.5 text-muted-foreground">{difficultyLabel(question.difficulty)}</span>}
          {question.topic && <span className="truncate text-muted-foreground">{question.topic}</span>}
        </div>
        <FormattedContent content={question.content} className="text-base text-foreground" />

        {question.hint && (
          <div className="mt-3">
            {showHint ? (
              <div className="flex items-start gap-2 rounded-lg bg-[var(--c-warning-bg)] p-3 text-sm text-[var(--c-text-2)]">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-[var(--c-warning)]" aria-hidden />
                <FormattedContent content={question.hint} />
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-[var(--c-warning)]" onClick={() => setShowHint(true)}>
                <Lightbulb />
                {t("quiz.showHint")}
              </Button>
            )}
          </div>
        )}
      </div>

      {!isEssay ? (
        <div className="grid gap-2" role="radiogroup" aria-label={t("quiz.options")}>
          {(question.options ?? []).map((opt, i) => {
            const isChosen = selected === opt;
            const isRight = result && opt.trim() === result.correct_answer.trim();
            const state = result ? (isRight ? "right" : isChosen ? "wrong" : "idle") : isChosen ? "chosen" : "idle";
            return (
              <button
                key={`${i}-${opt}`}
                type="button"
                role="radio"
                aria-checked={isChosen}
                disabled={Boolean(result) || check.isPending}
                onClick={() => chooseOption(opt)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors disabled:cursor-default",
                  state === "idle" && "hover:border-[var(--c-primary-border)] hover:bg-[var(--c-primary-bg)]",
                  state === "chosen" && "border-[var(--c-primary)] bg-[var(--c-primary-bg)]",
                  state === "right" && "border-[var(--c-success)] bg-[var(--c-success-bg)]",
                  state === "wrong" && "border-[var(--c-error)] bg-[var(--c-error-bg)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    state === "right" ? "bg-[var(--c-success)] text-white" : state === "wrong" ? "bg-[var(--c-error)] text-white" : "bg-[var(--c-bg-muted)] text-foreground",
                  )}
                >
                  {state === "right" ? <CheckCircle2 className="size-4" /> : state === "wrong" ? <XCircle className="size-4" /> : LETTERS[i] ?? i + 1}
                </span>
                <FormattedContent inline content={opt} className="flex-1 text-foreground" />
                {check.isPending && isChosen && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      ) : (
        !result && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <Textarea value={essay} onChange={(e) => setEssay(e.target.value)} rows={5} placeholder={t("quiz.essayPlaceholder")} aria-label={t("quiz.essayPlaceholder")} disabled={check.isPending} />
            {image && (
              <div className="inline-flex items-start gap-1 rounded-lg border bg-[var(--c-bg-subtle)] p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={t("quiz.essayImage")} className="h-20 w-auto max-w-[200px] rounded-md object-cover" />
                <Button variant="ghost" size="icon" className="size-6" onClick={() => setImage(null)} aria-label={t("quiz.removeImage")} disabled={check.isPending}>
                  <X />
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={check.isPending}>
                <ImagePlus />
                {t("quiz.attachPhoto")}
              </Button>
              <Button className="ml-auto" disabled={check.isPending || (!essay.trim() && !image)} onClick={() => check.mutate({ answer: essay.trim(), file: image?.file ?? null })}>
                {check.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                {check.isPending ? t("quiz.grading") : t("quiz.submitAnswer")}
              </Button>
            </div>
          </div>
        )
      )}

      {result && (
        <div
          role="status"
          className={cn("space-y-2 rounded-xl border p-4 text-sm animate-in fade-in slide-in-from-bottom-2", result.is_correct ? "border-[var(--c-success-border)] bg-[var(--c-success-bg)]" : "border-[var(--c-error-border)] bg-[var(--c-error-bg)]")}
        >
          <p className={cn("flex items-center gap-2 font-semibold", result.is_correct ? "text-[var(--c-success)]" : "text-[var(--c-error)]")}>
            {result.is_correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            {result.is_correct ? t("quiz.correct") : t("quiz.incorrect")}
            {isEssay && <span className="ml-auto tabular-nums">{t("quiz.essayScore", { score: result.score })}</span>}
          </p>
          {isEssay && checked?.answer && (
            <div className="text-[var(--c-text-2)]">
              <span className="font-medium">{t("result.yourAnswer")}: </span>
              <span className="whitespace-pre-wrap">{checked.answer}</span>
            </div>
          )}
          {result.feedback && <FormattedContent content={result.feedback} className="text-[var(--c-text-2)]" />}
          {(isEssay || !result.is_correct) && result.correct_answer && (
            <div className="text-[var(--c-text-2)]">
              <span className="font-medium">{isEssay ? t("quiz.modelAnswer") : t("result.correctAnswer")}: </span>
              <FormattedContent content={result.correct_answer} />
            </div>
          )}
          {result.explanation && (
            <div className="text-[var(--c-text-2)]">
              <span className="font-medium">{t("quiz.explanation")}: </span>
              <FormattedContent content={result.explanation} />
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        {result ? (
          <Button size="lg" onClick={onNext} disabled={finishing} autoFocus>
            {finishing ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            {isLast ? t("quiz.finish") : t("quiz.next")}
          </Button>
        ) : (
          <Button variant="ghost" onClick={onNext} disabled={check.isPending || finishing}>
            {isLast ? t("quiz.finish") : t("quiz.skip")}
          </Button>
        )}
      </div>
    </div>
  );
}
