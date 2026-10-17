"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, ClipboardCheck, Layers } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import { Button } from "@/components/ui/button";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { Panel } from "../../shared/ui";
import { useLearnProgressRefresh } from "../../shared/useLearnQueries";
import type { FlashcardDeck, Grade, QuizResult } from "../../shared/types";
import { practiceService } from "../practice.service";
import { FlashcardTest } from "./FlashcardTest";
import { FlashcardViewer } from "./FlashcardViewer";
import { PRACTICE_HISTORY_KEY } from "./HistoryTab";
import { ResultSummary } from "./ResultSummary";
import { TopicGradeForm } from "./TopicGradeForm";

type Mode = "view" | "test" | "result";

/** Tab "Flashcard": lấy bộ thẻ theo chủ đề -> lật thẻ -> kiểm tra -> kết quả */
export function FlashcardTab() {
  const t = useTranslations("learnPractice");
  const queryClient = useQueryClient();
  const refreshProgress = useLearnProgressRefresh();
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [result, setResult] = useState<QuizResult | null>(null);
  const [testRun, setTestRun] = useState(0);

  const load = useMutation({
    mutationFn: ({ grade, topic }: { grade: Grade | null; topic: string }) => practiceService.getFlashcards(grade, topic),
    onSuccess: (d) => {
      setDeck(d);
      setMode("view");
      setResult(null);
    },
    onError: (error) => toast.error(extractErrorMessage(error, t("flashcard.loadError"))),
  });

  const submit = useMutation({
    mutationFn: (answers: { card_index: number; answer: string }[]) => practiceService.submitFlashcards(deck?.id ?? 0, answers),
    onSuccess: (r) => {
      setResult(r);
      setMode("result");
      refreshProgress(r.completed_challenges);
      queryClient.invalidateQueries({ queryKey: PRACTICE_HISTORY_KEY });
    },
    onError: (error) => toast.error(extractErrorMessage(error, t("quiz.submitError"))),
  });

  const cards = deck?.cards.filter((c) => c && typeof c.front === "string" && typeof c.back === "string") ?? [];

  return (
    <div className="space-y-4">
      <Panel title={t("flashcard.setupTitle")} icon={<Layers />}>
        <TopicGradeForm
          loading={load.isPending}
          submitLabel={t("flashcard.load")}
          loadingLabel={t("flashcard.loading")}
          onSubmit={(grade, topic) => load.mutate({ grade, topic })}
        />
      </Panel>

      {deck && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{deck.title}</h2>
              <p className="text-xs text-muted-foreground">{t("flashcard.cardCount", { count: cards.length })}</p>
            </div>
            {mode === "view" && cards.length > 1 && (
              <Button onClick={() => { setTestRun((n) => n + 1); setMode("test"); }}>
                <ClipboardCheck />
                {t("flashcard.startTest")}
              </Button>
            )}
            {mode === "test" && (
              <Button variant="ghost" onClick={() => setMode("view")}>
                <ArrowLeft />
                {t("flashcard.backToCards")}
              </Button>
            )}
          </div>
          {!cards.length ? (
            <EmptyState title={t("flashcard.empty")} />
          ) : mode === "view" ? (
            <FlashcardViewer key={deck.id} cards={cards} />
          ) : mode === "test" ? (
            <FlashcardTest key={`${deck.id}-${testRun}`} cards={cards} submitting={submit.isPending} onSubmit={(answers) => submit.mutate(answers)} />
          ) : result ? (
            <ResultSummary
              correct={result.correct_count}
              total={result.total_questions}
              xp={result.xp_earned}
              onRetry={() => { setTestRun((n) => n + 1); setMode("test"); }}
              onNew={() => setMode("view")}
              items={result.results.map((r, i) => ({
                key: r.card_index ?? i,
                prompt: cards[r.card_index ?? -1]?.front ?? "",
                answer: r.answer,
                correctAnswer: r.correct_answer,
                isCorrect: r.is_correct,
              }))}
            />
          ) : null}
        </section>
      )}
    </div>
  );
}
