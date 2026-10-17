"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, RotateCcw, Settings2, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormattedContent } from "../../shared/FormattedContent";
import { Panel, ProgressRing } from "../../shared/ui";
import { fireConfetti } from "../../shared/confetti";

export interface ReviewItem {
  key: string | number;
  prompt: string;
  answer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

/** Màn hình kết quả: vòng điểm, XP, xem lại từng câu */
export function ResultSummary({
  correct,
  total,
  xp,
  items,
  onRetry,
  onNew,
}: {
  correct: number;
  total: number;
  xp: number;
  items: ReviewItem[];
  onRetry?: () => void;
  onNew: () => void;
}) {
  const t = useTranslations("learnPractice");
  const ratio = total ? correct / total : 0;
  const tone = ratio >= 0.8 ? "success" : ratio >= 0.5 ? "warning" : "error";
  const verdict = ratio >= 0.8 ? "great" : ratio >= 0.5 ? "good" : "keepGoing";

  // Pháo giấy khi đạt từ 80% (hiệu ứng DOM ngoài React)
  useEffect(() => {
    if (ratio >= 0.8) fireConfetti();
  }, [ratio]);

  return (
    <div className="space-y-4">
      <section className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 text-center sm:flex-row sm:text-left">
        <ProgressRing value={ratio} tone={tone} size={128}>
          <span className="text-2xl font-semibold text-foreground tabular-nums">
            {correct}/{total}
          </span>
          <span className="text-xs text-muted-foreground">{t("result.correct")}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">{t(`result.verdict.${verdict}`)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("result.summary", { correct, total })}</p>
          {xp > 0 && (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--c-warning-bg)] px-3 py-1 text-sm font-semibold text-[var(--c-warning)]">
              <Zap className="size-4" aria-hidden />
              {t("result.xp", { xp })}
            </span>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            {onRetry && (
              <Button onClick={onRetry}>
                <RotateCcw />
                {t("result.retry")}
              </Button>
            )}
            <Button variant="outline" onClick={onNew}>
              <Settings2 />
              {t("result.newSetup")}
            </Button>
          </div>
        </div>
      </section>

      {items.length > 0 && (
        <Panel title={t("result.review")}>
          <ol className="space-y-3">
            {items.map((item, i) => (
              <li key={item.key} className={cn("rounded-lg border-l-4 bg-[var(--c-bg-subtle)] p-3", item.isCorrect ? "border-l-[var(--c-success)]" : "border-l-[var(--c-error)]")}>
                <div className="flex items-start gap-2">
                  {item.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--c-success)]" aria-label={t("quiz.correct")} />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-[var(--c-error)]" aria-label={t("quiz.incorrect")} />
                  )}
                  <div className="min-w-0 flex-1 space-y-1 text-sm">
                    <div className="flex gap-1 font-medium text-foreground">
                      <span className="shrink-0">{i + 1}.</span>
                      <FormattedContent content={item.prompt} />
                    </div>
                    <p className="text-muted-foreground">
                      {t("result.yourAnswer")}: <FormattedContent inline content={item.answer || t("result.noAnswer")} className={item.isCorrect ? "text-[var(--c-success)]" : "text-[var(--c-error)]"} />
                    </p>
                    {!item.isCorrect && item.correctAnswer && (
                      <p className="text-muted-foreground">
                        {t("result.correctAnswer")}: <FormattedContent inline content={item.correctAnswer} className="font-medium text-[var(--c-success)]" />
                      </p>
                    )}
                    {item.explanation && <FormattedContent content={item.explanation} className="text-[var(--c-text-2)]" />}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}
