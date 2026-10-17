"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useController, useFormContext } from "react-hook-form";
import { FieldShell } from "@/components/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { hasDuplicateOptions, OPTION_LETTERS, type QuestionFormValues } from "../questionPayload";

const isChoice = (values: QuestionFormValues) => values.question_type === "MULTIPLE_CHOICE";

function OptionInput({ index }: { index: number }) {
  const t = useTranslations("questions");
  const tv = useTranslations("validation");
  const { control } = useFormContext<QuestionFormValues>();
  const label = t("form.optionLabel", { letter: OPTION_LETTERS[index] });
  const { field, fieldState } = useController({
    control,
    name: `options.${index}`,
    rules: {
      validate: (v, all) => !isChoice(all) || Boolean(v.trim()) || tv("required", { field: label }),
      maxLength: { value: 500, message: tv("maxLength", { max: 500 }) },
    },
  });
  return (
    <div className="min-w-0 flex-1">
      <Input {...field} id={`f-options-${index}`} placeholder={label} aria-label={label} aria-invalid={Boolean(fieldState.error)} />
      {fieldState.error?.message && <p className="mt-1 text-xs text-destructive">{fieldState.error.message}</p>}
    </div>
  );
}

/** 4 phương án trắc nghiệm + nút radio chọn đáp án đúng (giá trị form `correct_index`) */
export function QuestionOptionsField() {
  const t = useTranslations("questions");
  const { control } = useFormContext<QuestionFormValues>();
  const { field, fieldState } = useController({
    control,
    name: "correct_index",
    rules: {
      validate: (v, all) => {
        if (!isChoice(all)) return true;
        if (hasDuplicateOptions(all.options)) return t("form.optionsDuplicate");
        return v !== "" || t("form.correctRequired");
      },
    },
  });
  return (
    <FieldShell id="f-correct_index" label={t("fields.options")} required hint={t("form.optionsHint")} error={fieldState.error?.message} className="form-section__full">
      <RadioGroup value={field.value} onValueChange={field.onChange} aria-label={t("fields.correctAnswer")} className="gap-2">
        {OPTION_LETTERS.map((letter, index) => {
          const selected = field.value === String(index);
          return (
            <div
              key={letter}
              className={cn("flex items-start gap-3 rounded-md border px-3 py-2", selected && "border-[var(--c-success)] bg-[var(--c-success-bg)]")}
            >
              <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-2 text-sm font-semibold">
                <RadioGroupItem value={String(index)} aria-label={`${letter} — ${t("form.markCorrect")}`} />
                {letter}
              </label>
              <OptionInput index={index} />
            </div>
          );
        })}
      </RadioGroup>
    </FieldShell>
  );
}
