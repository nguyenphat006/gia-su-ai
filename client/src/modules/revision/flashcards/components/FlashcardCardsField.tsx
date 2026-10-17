"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { FieldShell, TextareaField } from "@/components/form";
import { Button } from "@/components/ui/button";
import type { FlashcardFormValues } from "./FlashcardDeckFormModal";

/** Trình sửa danh sách thẻ: mỗi dòng Mặt trước / Mặt sau, thêm / bỏ (tối thiểu 1 thẻ) */
export function FlashcardCardsField() {
  const t = useTranslations("flashcardDecks");
  const tv = useTranslations("validation");
  const { control, formState } = useFormContext<FlashcardFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "cards", rules: { minLength: { value: 1, message: t("form.minCards") } } });
  const rootError = formState.errors.cards?.root?.message ?? formState.errors.cards?.message;

  return (
    <FieldShell id="f-cards" label={t("fields.cards")} required hint={t("form.cardsHint")} error={rootError} className="form-section__full">
      <ol className="space-y-3">
        {fields.map((field, index) => (
          <li key={field.id} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t("form.cardLabel", { index: index + 1 })}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("form.removeCard", { index: index + 1 })}
                className="text-muted-foreground hover:text-destructive"
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextareaField<FlashcardFormValues>
                name={`cards.${index}.front`}
                label={t("fields.front")}
                placeholder={t("form.frontPlaceholder")}
                rows={2}
                maxLength={500}
                rules={{ validate: (v) => Boolean(String(v ?? "").trim()) || tv("required", { field: t("fields.front") }) }}
              />
              <TextareaField<FlashcardFormValues>
                name={`cards.${index}.back`}
                label={t("fields.back")}
                placeholder={t("form.backPlaceholder")}
                rows={2}
                maxLength={1000}
                rules={{ validate: (v) => Boolean(String(v ?? "").trim()) || tv("required", { field: t("fields.back") }) }}
              />
            </div>
          </li>
        ))}
      </ol>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => append({ front: "", back: "" })}>
        <Plus />
        {t("form.addCard")}
      </Button>
    </FieldShell>
  );
}
