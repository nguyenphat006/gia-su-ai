"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoicePills, DifficultyPicker, FieldBlock, GradeSelect, TopicField, useMyGrade } from "../../shared/SetupFields";
import type { Difficulty, Grade, QuestionType } from "../../shared/types";

export interface QuizConfig {
  grade: Grade | null;
  topic: string;
  count: number;
  questionType: QuestionType;
  difficulties: Difficulty[];
}

const COUNTS = [5, 10, 15, 20];

/** Thiết lập bài ôn tập: khối, chủ đề, số câu, dạng câu, mức độ */
export function QuizSetupForm({ initial, onStart, loading }: { initial?: QuizConfig | null; onStart: (c: QuizConfig) => void; loading: boolean }) {
  const t = useTranslations("learnPractice");
  const tl = useTranslations("learn");
  const myGrade = useMyGrade();
  const id = useId();
  const [config, setConfig] = useState<QuizConfig>(
    () => initial ?? { grade: myGrade, topic: "", count: 10, questionType: "MULTIPLE_CHOICE", difficulties: [] },
  );
  const patch = (p: Partial<QuizConfig>) => setConfig((c) => ({ ...c, ...p }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onStart({ ...config, topic: config.topic.trim() });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
        <FieldBlock label={tl("setup.grade")} htmlFor={`${id}-grade`}>
          <GradeSelect id={`${id}-grade`} value={config.grade} onChange={(grade) => patch({ grade })} />
        </FieldBlock>
        <FieldBlock label={tl("setup.topic")} htmlFor={`${id}-topic`}>
          <TopicField id={`${id}-topic`} value={config.topic} grade={config.grade} onChange={(topic) => patch({ topic })} />
        </FieldBlock>
      </div>
      <FieldBlock label={tl("setup.count")}>
        <ChoicePills label={tl("setup.count")} value={config.count} options={COUNTS.map((n) => ({ value: n, label: String(n) }))} onChange={(count) => patch({ count })} />
      </FieldBlock>
      <FieldBlock label={tl("setup.type")}>
        <ChoicePills<QuestionType>
          label={tl("setup.type")}
          value={config.questionType}
          options={[
            { value: "MULTIPLE_CHOICE", label: t("questionType.MULTIPLE_CHOICE") },
            { value: "ESSAY", label: t("questionType.ESSAY") },
          ]}
          onChange={(questionType) => patch({ questionType })}
        />
      </FieldBlock>
      <FieldBlock label={tl("setup.difficulty")}>
        <DifficultyPicker value={config.difficulties} onChange={(difficulties) => patch({ difficulties })} />
        <p className="text-xs text-muted-foreground">{tl("setup.difficultyHint")}</p>
      </FieldBlock>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Play />}
          {loading ? t("quiz.preparing") : t("quiz.start")}
        </Button>
        {loading && <span className="text-xs text-muted-foreground">{t("quiz.preparingHint")}</span>}
      </div>
    </form>
  );
}
