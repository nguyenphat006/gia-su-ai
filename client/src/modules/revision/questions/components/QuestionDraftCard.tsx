"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { OPTION_LETTERS } from "../questionPayload";
import { DIFFICULTY } from "../questionStatus";
import type { QuestionDraft } from "../types";

interface QuestionDraftCardProps {
  index: number;
  draft: QuestionDraft;
  selected: boolean;
  onToggle: () => void;
}

/** Một câu AI soạn: ô chọn · nội dung · 4 phương án (đáp án đúng tô xanh) hoặc đáp án mẫu · giải thích */
export function QuestionDraftCard({ index, draft, selected, onToggle }: QuestionDraftCardProps) {
  const t = useTranslations("questions");
  const id = `ai-draft-${index}`;
  return (
    <div className={cn("rounded-lg border p-3 transition-colors", selected ? "border-primary bg-[var(--c-primary-bg)]" : "bg-card")}>
      <div className="flex items-start gap-3">
        <Checkbox id={id} checked={selected} onCheckedChange={onToggle} className="mt-0.5" />
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor={id} className="flex cursor-pointer flex-wrap items-start gap-2 text-sm font-medium text-foreground">
            <span className="text-muted-foreground">{index + 1}.</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap">{draft.content}</span>
            {draft.difficulty in DIFFICULTY && <StatusBadge map={DIFFICULTY} value={draft.difficulty} />}
          </label>
          {draft.options?.length ? (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {draft.options.map((option, i) => {
                const correct = option === draft.correct_answer;
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-2 rounded-md border px-2 py-1 text-sm",
                      correct ? "border-[var(--c-success)] bg-[var(--c-success-bg)] font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className="font-semibold">{OPTION_LETTERS[i] ?? i + 1}.</span>
                    <span className="min-w-0 flex-1">{option}</span>
                    {correct && <CheckCircle2 className="size-4 shrink-0 text-[var(--c-success)]" aria-label={t("form.markCorrect")} />}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-md border border-[var(--c-success)] bg-[var(--c-success-bg)] px-2 py-1 text-sm whitespace-pre-wrap">
              <span className="font-medium">{t("fields.sampleAnswer")}: </span>
              {draft.correct_answer}
            </p>
          )}
          {draft.explanation && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{t("fields.explanation")}: </span>
              {draft.explanation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
