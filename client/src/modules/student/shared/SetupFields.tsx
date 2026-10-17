"use client";

import React, { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { http } from "@/lib/api/axiosClient";
import { normalizeText } from "@/lib/text/normalize";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { DIFFICULTIES, GRADES, type Difficulty, type Grade } from "./types";
import { LEARN_KEY } from "./useLearnQueries";

const NO_TOPICS: string[] = [];
const MAX_SUGGESTIONS = 8;

/** Khối của học sinh đang đăng nhập (null với giáo viên / quản trị) */
export function useMyGrade(): Grade | null {
  const grade = useAuthStore((s) => s.user?.student_profile?.grade);
  return grade && (GRADES as number[]).includes(grade) ? (grade as Grade) : null;
}

export function FieldBlock({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Chọn khối 6–9 */
export function GradeSelect({ value, onChange, id }: { value: Grade | null; onChange: (g: Grade) => void; id?: string }) {
  const t = useTranslations("learn");
  return (
    <Select value={value ? String(value) : undefined} onValueChange={(v) => v && onChange(Number(v) as Grade)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={t("setup.gradePlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        {GRADES.map((g) => (
          <SelectItem key={g} value={String(g)}>
            {t("setup.gradeOption", { grade: g })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Nhãn mức độ (mã lạ từ server -> hiện nguyên mã) */
export function useDifficultyLabel() {
  const t = useTranslations("learn");
  return (code: string | null | undefined): string => {
    if (!code) return "";
    return (DIFFICULTIES as string[]).includes(code) ? t(`difficulty.${code as Difficulty}`) : code;
  };
}

/** Chọn nhiều mức độ (không chọn = mọi mức) */
export function DifficultyPicker({ value, onChange }: { value: Difficulty[]; onChange: (v: Difficulty[]) => void }) {
  const t = useTranslations("learn");
  const toggle = (d: Difficulty) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("setup.difficulty")}>
      {DIFFICULTIES.map((d) => {
        const active = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(d)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm transition-colors",
              active ? "border-[var(--c-primary)] bg-[var(--c-primary-bg)] text-[var(--c-primary)]" : "text-muted-foreground hover:bg-[var(--c-bg-subtle)]",
            )}
          >
            {active && <Check className="size-3.5" />}
            {t(`difficulty.${d}`)}
          </button>
        );
      })}
    </div>
  );
}

/** Chọn một giá trị trong danh sách nhỏ dạng nút (số câu, loại câu) */
export function ChoicePills<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-9 min-w-12 rounded-full border px-3 text-sm font-medium transition-colors",
              active ? "border-[var(--c-primary)] bg-[var(--c-primary)] text-white" : "text-foreground hover:bg-[var(--c-bg-subtle)]",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Ô chủ đề: gõ tự do + gợi ý từ ngân hàng câu hỏi (`/learn/practice/topics/`) */
export function TopicField({ value, onChange, grade, id }: { value: string; onChange: (v: string) => void; grade: Grade | null; id?: string }) {
  const t = useTranslations("learn");
  const listId = useId();
  const [open, setOpen] = useState(false);
  const { data: topics = NO_TOPICS } = useQuery({
    queryKey: [...LEARN_KEY, "topics", grade],
    queryFn: () => http.get<string[]>("/learn/practice/topics/", { params: { grade: grade ?? undefined } }),
    staleTime: 5 * 60_000,
  });
  const suggestions = useMemo(() => {
    const q = normalizeText(value);
    const list = q ? topics.filter((x) => normalizeText(x).includes(q) && x !== value) : topics;
    return list.slice(0, MAX_SUGGESTIONS);
  }, [topics, value]);
  const show = open && suggestions.length > 0;

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        maxLength={255}
        autoComplete="off"
        placeholder={t("setup.topicPlaceholder")}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      />
      {show && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {suggestions.map((s) => (
            <li key={s} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full truncate rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                // Chặn mất focus trước khi chọn
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
