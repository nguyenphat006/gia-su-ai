"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldBlock, GradeSelect, TopicField, useMyGrade } from "../../shared/SetupFields";
import type { Grade } from "../../shared/types";

/** Chọn khối + chủ đề rồi lấy nội dung (flashcard / sơ đồ tư duy) */
export function TopicGradeForm({
  onSubmit,
  loading,
  submitLabel,
  loadingLabel,
}: {
  onSubmit: (grade: Grade | null, topic: string) => void;
  loading: boolean;
  submitLabel: string;
  loadingLabel: string;
}) {
  const tl = useTranslations("learn");
  const id = useId();
  const myGrade = useMyGrade();
  const [grade, setGrade] = useState<Grade | null>(myGrade);
  const [topic, setTopic] = useState("");

  return (
    <form
      className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (topic.trim() && !loading) onSubmit(grade, topic.trim());
      }}
    >
      <FieldBlock label={tl("setup.grade")} htmlFor={`${id}-g`}>
        <GradeSelect id={`${id}-g`} value={grade} onChange={setGrade} />
      </FieldBlock>
      <FieldBlock label={tl("setup.topic")} htmlFor={`${id}-t`}>
        <TopicField id={`${id}-t`} value={topic} onChange={setTopic} grade={grade} />
      </FieldBlock>
      <Button type="submit" disabled={loading || !topic.trim()}>
        {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {loading ? loadingLabel : submitLabel}
      </Button>
    </form>
  );
}
