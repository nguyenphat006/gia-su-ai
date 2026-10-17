"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/feedback/confirm";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { Panel } from "../../shared/ui";
import { useLearnProgressRefresh } from "../../shared/useLearnQueries";
import type { CheckAnswerResult, PublicQuestion, QuizResult } from "../../shared/types";
import { practiceService } from "../practice.service";
import { PRACTICE_HISTORY_KEY } from "./HistoryTab";
import { QuizQuestionCard } from "./QuizQuestionCard";
import { type QuizConfig, QuizSetupForm } from "./QuizSetupForm";
import { ResultSummary } from "./ResultSummary";

type Checked = Record<number, { answer: string; result: CheckAnswerResult }>;

type Phase =
  | { kind: "setup" }
  | { kind: "running"; questions: PublicQuestion[] }
  | { kind: "result"; questions: PublicQuestion[]; result: QuizResult };

/** Tab "Làm bài": thiết lập -> từng câu (chấm ngay) -> nộp bài -> kết quả */
export function QuizTab() {
  const t = useTranslations("learnPractice");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const refreshProgress = useLearnProgressRefresh();
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<Checked>({});

  const start = useMutation({
    mutationFn: (c: QuizConfig) =>
      practiceService.startQuiz({ grade: c.grade, topic: c.topic, count: c.count, question_type: c.questionType, difficulties: c.difficulties }),
    onSuccess: (questions) => {
      if (!questions.length) return void toast.warning(t("quiz.noQuestions"));
      setIndex(0);
      setChecked({});
      setPhase({ kind: "running", questions });
    },
    onError: (error) => toast.error(extractErrorMessage(error, t("quiz.startError"))),
  });

  const submit = useMutation({
    mutationFn: (questions: PublicQuestion[]) =>
      practiceService.submitQuiz(
        config?.grade ?? null,
        config?.topic ?? "",
        questions.map((q) => ({ question_id: q.id, answer: checked[q.id]?.answer ?? "" })),
      ),
    onSuccess: (result, questions) => {
      setPhase({ kind: "result", questions, result });
      refreshProgress(result.completed_challenges);
      queryClient.invalidateQueries({ queryKey: PRACTICE_HISTORY_KEY });
    },
    onError: (error) => toast.error(extractErrorMessage(error, t("quiz.submitError"))),
  });

  const begin = (c: QuizConfig) => {
    setConfig(c);
    start.mutate(c);
  };

  const quit = async () => {
    const ok = await confirm({ title: t("quiz.quitTitle"), description: t("quiz.quitDescription"), confirmText: t("quiz.quit"), danger: true });
    if (ok) setPhase({ kind: "setup" });
  };

  if (phase.kind === "setup") {
    return (
      <Panel title={t("quiz.setupTitle")}>
        <QuizSetupForm initial={config} onStart={begin} loading={start.isPending} />
      </Panel>
    );
  }

  if (phase.kind === "result") {
    const byId = new Map(phase.questions.map((q) => [q.id, q]));
    return (
      <ResultSummary
        correct={phase.result.correct_count}
        total={phase.result.total_questions}
        xp={phase.result.xp_earned}
        onRetry={config ? () => start.mutate(config) : undefined}
        onNew={() => setPhase({ kind: "setup" })}
        items={phase.result.results.map((r, i) => ({
          key: r.question_id ?? i,
          prompt: byId.get(r.question_id ?? -1)?.content ?? "",
          answer: r.answer,
          correctAnswer: r.correct_answer,
          isCorrect: r.is_correct,
          explanation: r.explanation,
        }))}
      />
    );
  }

  const { questions } = phase;
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const done = Object.keys(checked).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={quit} aria-label={t("quiz.quit")}>
          <X />
        </Button>
        <Progress value={((index + (checked[question.id] ? 1 : 0)) / questions.length) * 100} className="h-2.5 flex-1 bg-[var(--c-bg-muted)]" aria-label={t("quiz.progress")} />
        <span className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
          {t("quiz.counter", { current: index + 1, total: questions.length })}
        </span>
      </div>
      <QuizQuestionCard
        key={question.id}
        question={question}
        checked={checked[question.id]}
        onChecked={(answer, result) => setChecked((prev) => ({ ...prev, [question.id]: { answer, result } }))}
        isLast={isLast}
        finishing={submit.isPending}
        onNext={() => (isLast ? submit.mutate(questions) : setIndex(index + 1))}
      />
      <p className="text-center text-xs text-muted-foreground">{t("quiz.answeredCount", { done, total: questions.length })}</p>
    </div>
  );
}
