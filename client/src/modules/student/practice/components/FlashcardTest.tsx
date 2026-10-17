"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FormattedContent } from "../../shared/FormattedContent";
import type { FlashCard } from "../../shared/types";
import { buildFlashcardQuiz } from "../flashcardQuiz";

/** Kiểm tra flashcard: mỗi thẻ chọn mặt sau đúng trong tối đa 4 lựa chọn; xong thì nộp cho server chấm */
export function FlashcardTest({
  cards,
  submitting,
  onSubmit,
}: {
  cards: FlashCard[];
  submitting: boolean;
  onSubmit: (answers: { card_index: number; answer: string }[]) => void;
}) {
  const t = useTranslations("learnPractice");
  const [questions] = useState(() => buildFlashcardQuiz(cards));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const q = questions[index];
  const chosen = answers[q.cardIndex];
  const correct = cards[q.cardIndex].back;
  const isLast = index === questions.length - 1;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={((index + (chosen != null ? 1 : 0)) / questions.length) * 100} className="h-2.5 flex-1 bg-[var(--c-bg-muted)]" aria-label={t("quiz.progress")} />
        <span className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">{t("quiz.counter", { current: index + 1, total: questions.length })}</span>
      </div>
      <div className="rounded-xl border bg-card p-5 text-center">
        <p className="mb-2 text-xs font-medium text-[var(--c-primary)]">{t("flashcard.testPrompt")}</p>
        <FormattedContent content={q.front} className="text-lg font-semibold text-foreground" />
      </div>
      <div className="grid gap-2" role="radiogroup" aria-label={t("quiz.options")}>
        {q.options.map((opt, i) => {
          const isChosen = chosen === opt;
          const isRight = chosen != null && opt === correct;
          return (
            <button
              key={`${i}-${opt}`}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={chosen != null}
              onClick={() => setAnswers((prev) => ({ ...prev, [q.cardIndex]: opt }))}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors disabled:cursor-default",
                chosen == null && "hover:border-[var(--c-primary-border)] hover:bg-[var(--c-primary-bg)]",
                isRight && "border-[var(--c-success)] bg-[var(--c-success-bg)]",
                isChosen && !isRight && "border-[var(--c-error)] bg-[var(--c-error-bg)]",
              )}
            >
              {isRight ? <CheckCircle2 className="size-5 shrink-0 text-[var(--c-success)]" /> : isChosen ? <XCircle className="size-5 shrink-0 text-[var(--c-error)]" /> : <span className="size-5 shrink-0 rounded-full border-2" />}
              <FormattedContent inline content={opt} className="flex-1 text-foreground" />
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={chosen == null || submitting}
          onClick={() =>
            isLast ? onSubmit(questions.map((x) => ({ card_index: x.cardIndex, answer: answers[x.cardIndex] ?? "" }))) : setIndex(index + 1)
          }
        >
          {submitting ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          {isLast ? t("quiz.finish") : t("quiz.next")}
        </Button>
      </div>
    </div>
  );
}
