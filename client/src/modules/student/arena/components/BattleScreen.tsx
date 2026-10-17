"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Bot, CheckCircle2, Clock, Loader2, LogOut, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormattedContent } from "../../shared/FormattedContent";
import { useDifficultyLabel } from "../../shared/SetupFields";
import { currentQuestion, isLastQuestion, type BattleState } from "../battleReducer";
import { AutoAdvance, QuestionTimer } from "./timers";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
/** Thời gian xem đáp án trước khi sang câu tiếp */
export const REVEAL_MS = 2500;

function ScoreSide({ name, score, icon, align, highlight }: { name: string; score: number; icon: React.ReactNode; align: "left" | "right"; highlight: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", highlight ? "bg-[var(--c-primary)] text-white" : "bg-[var(--c-error-bg)] text-[var(--c-error)]")}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{name}</p>
        <p className="text-xl font-semibold text-foreground tabular-nums">{score}</p>
      </div>
    </div>
  );
}

/**
 * Màn hình thi đấu dùng chung (AI / PvP): bảng điểm, đồng hồ 30s, câu hỏi, đáp án; sau khi trả lời -> chờ đối thủ -> xem đáp án.
 */
export function BattleScreen({
  state,
  mode,
  myName,
  onAnswer,
  onRevealDone,
  onLeave,
  finishing,
}: {
  state: BattleState;
  mode: "ai" | "pvp";
  myName: string;
  onAnswer: (answer: string) => void;
  onRevealDone: () => void;
  onLeave: () => void;
  finishing?: boolean;
}) {
  const t = useTranslations("learnArena");
  const difficultyLabel = useDifficultyLabel();
  const q = currentQuestion(state);
  if (!q) return null;
  const { phase, mine, opponent } = state;
  const answered = phase !== "answering";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2 rounded-xl border bg-card p-3">
        <ScoreSide name={myName} score={state.myScore} icon={<User className="size-5" />} align="left" highlight />
        <span className="shrink-0 rounded-full bg-[var(--c-bg-muted)] px-3 py-1 text-xs font-semibold text-muted-foreground">{t("battle.vs")}</span>
        <ScoreSide name={state.opponentName} score={state.opponentScore} icon={mode === "ai" ? <Bot className="size-5" /> : <User className="size-5" />} align="right" highlight={false} />
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-muted-foreground tabular-nums">{t("battle.counter", { current: state.index + 1, total: state.questions.length })}</span>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onLeave}>
          <LogOut />
          {t("battle.leave")}
        </Button>
      </div>

      <QuestionTimer key={state.index} seconds={state.secondsPerQuestion} running={phase === "answering"} onExpire={() => onAnswer("")} />

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {q.difficulty && <span className="mb-2 inline-block rounded-full bg-[var(--c-bg-muted)] px-2 py-0.5 text-xs text-muted-foreground">{difficultyLabel(q.difficulty)}</span>}
        <FormattedContent content={q.content} className="text-base text-foreground" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("battle.options")}>
        {q.options.map((opt, i) => {
          const chosen = state.myAnswer === opt;
          const isRight = mine != null && phase === "reveal" && opt.trim() === mine.correctAnswer.trim();
          const isWrong = phase === "reveal" && chosen && !isRight;
          return (
            <button
              key={`${i}-${opt}`}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={answered}
              onClick={() => onAnswer(opt)}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-xl border-2 bg-card px-4 py-3 text-left text-sm transition-all disabled:cursor-default",
                !answered && "hover:-translate-y-0.5 hover:border-[var(--c-primary)] hover:shadow-sm active:translate-y-0",
                chosen && !isRight && !isWrong && "border-[var(--c-primary)] bg-[var(--c-primary-bg)]",
                isRight && "border-[var(--c-success)] bg-[var(--c-success-bg)]",
                isWrong && "border-[var(--c-error)] bg-[var(--c-error-bg)]",
                answered && !chosen && !isRight && "opacity-60",
              )}
            >
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", isRight ? "bg-[var(--c-success)] text-white" : isWrong ? "bg-[var(--c-error)] text-white" : "bg-[var(--c-bg-muted)] text-foreground")}>
                {LETTERS[i] ?? i + 1}
              </span>
              <FormattedContent inline content={opt} className="flex-1 text-foreground" />
            </button>
          );
        })}
      </div>

      {phase === "waiting" && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" />
          {mode === "pvp" && mine ? t("battle.waitingOpponent") : t("battle.checking")}
        </p>
      )}

      {phase === "reveal" && mine && (
        <div role="status" className="space-y-2 rounded-xl border bg-card p-4 text-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className={cn("flex items-center gap-1 font-semibold", mine.isCorrect ? "text-[var(--c-success)]" : "text-[var(--c-error)]")}>
              {mine.isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {state.myAnswer === "" ? t("battle.timeout") : mine.isCorrect ? t("battle.youCorrect") : t("battle.youWrong")}
              {mine.points != null && mine.points > 0 && <span className="tabular-nums">{t("battle.points", { points: mine.points })}</span>}
            </span>
            {opponent && (
              <span className={cn("flex items-center gap-1", opponent.isCorrect ? "text-[var(--c-success)]" : "text-muted-foreground")}>
                {mode === "ai" ? <Bot className="size-4" /> : <User className="size-4" />}
                {opponent.isCorrect ? t("battle.opponentCorrect", { name: state.opponentName }) : t("battle.opponentWrong", { name: state.opponentName })}
                {opponent.points > 0 && <span className="tabular-nums">{t("battle.points", { points: opponent.points })}</span>}
                <Clock className="ml-1 size-3.5" aria-hidden />
                <span className="tabular-nums">{t("battle.secondsShort", { seconds: opponent.timeLeft })}</span>
              </span>
            )}
          </div>
          {!mine.isCorrect && mine.correctAnswer && (
            <p className="text-[var(--c-text-2)]">
              {t("battle.correctAnswer")}: <FormattedContent inline content={mine.correctAnswer} className="font-medium text-[var(--c-success)]" />
            </p>
          )}
          {mine.explanation && <FormattedContent content={mine.explanation} className="text-[var(--c-text-2)]" />}
          <div className="flex items-center justify-end gap-2 pt-1">
            {finishing ? (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {t("battle.finishing")}
              </span>
            ) : (
              <Button size="sm" onClick={onRevealDone}>
                {isLastQuestion(state) ? t("battle.seeResult") : t("battle.nextQuestion")}
              </Button>
            )}
          </div>
          {!finishing && <AutoAdvance key={state.index} ms={REVEAL_MS + (mine.explanation ? 2000 : 0)} onDone={onRevealDone} />}
        </div>
      )}
    </div>
  );
}
