"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChoicePills, DifficultyPicker, FieldBlock, GradeSelect, TopicField, useMyGrade } from "../../shared/SetupFields";
import type { ArenaConfig } from "../../shared/types";

const COUNTS = [5, 10, 15, 20];

function ConfigForm({
  showGrade,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}: {
  showGrade: boolean;
  submitLabel: string;
  loading: boolean;
  onSubmit: (c: ArenaConfig) => void;
  onCancel: () => void;
}) {
  const tl = useTranslations("learn");
  const tc = useTranslations("common");
  const id = useId();
  const myGrade = useMyGrade();
  const [config, setConfig] = useState<ArenaConfig>({ topic: "", count: 10, difficulties: [], grade: myGrade });
  const patch = (p: Partial<ArenaConfig>) => setConfig((c) => ({ ...c, ...p }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading) onSubmit({ ...config, topic: config.topic.trim() });
      }}
    >
      {showGrade && (
        <FieldBlock label={tl("setup.grade")} htmlFor={`${id}-g`}>
          <GradeSelect id={`${id}-g`} value={config.grade} onChange={(grade) => patch({ grade })} />
        </FieldBlock>
      )}
      <FieldBlock label={tl("setup.topic")} htmlFor={`${id}-t`}>
        <TopicField id={`${id}-t`} value={config.topic} grade={config.grade} onChange={(topic) => patch({ topic })} />
      </FieldBlock>
      <FieldBlock label={tl("setup.count")}>
        <ChoicePills label={tl("setup.count")} value={config.count} options={COUNTS.map((n) => ({ value: n, label: String(n) }))} onChange={(count) => patch({ count })} />
      </FieldBlock>
      <FieldBlock label={tl("setup.difficulty")}>
        <DifficultyPicker value={config.difficulties} onChange={(difficulties) => patch({ difficulties })} />
        <p className="text-xs text-muted-foreground">{tl("setup.difficultyHint")}</p>
      </FieldBlock>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {tc("actions.cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Swords />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Hộp thoại thiết lập trận: chủ đề, số câu, mức độ (+ khối khi đấu AI) */
export function ArenaConfigDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  showGrade = false,
  loading = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  showGrade?: boolean;
  loading?: boolean;
  onSubmit: (c: ArenaConfig) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {/* Mỗi lần mở là form mới (Dialog chỉ render nội dung khi mở) */}
        <ConfigForm showGrade={showGrade} submitLabel={submitLabel} loading={loading} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
