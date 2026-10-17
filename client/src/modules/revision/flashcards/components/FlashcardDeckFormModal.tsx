"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { FormDialog, FormSection, SwitchField, TextField, TextareaField } from "@/components/form";
import { AiDraftButton } from "../../shared/AiDraftButton";
import { ScopeFields } from "../../shared/ScopeFields";
import { EMPTY_SCOPE, fromGrade, scopePayload, type ScopeFormValues } from "../../shared/scope";
import { cardsPayload, normalizeCards } from "../flashcardUtils";
import { useFlashcardAiDraftMutation } from "../hooks/useFlashcardDecksQuery";
import type { Flashcard, FlashcardDeckCreateInput, FlashcardDeckItem } from "../types";
import { FlashcardCardsField } from "./FlashcardCardsField";

export interface FlashcardFormValues extends ScopeFormValues {
  title: string;
  cards: Flashcard[];
  description: string;
  is_active: boolean;
}

interface FlashcardDeckFormModalProps {
  open: boolean;
  editing: FlashcardDeckItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: FlashcardDeckCreateInput) => Promise<void>;
  /** Có quyền tạo -> được dùng AI soạn nháp (backend yêu cầu FLASHCARD_CREATE) */
  canUseAi: boolean;
}

const EMPTY: FlashcardFormValues = { ...EMPTY_SCOPE, title: "", cards: [{ front: "", back: "" }], description: "", is_active: true };

const toValues = (r: FlashcardDeckItem): FlashcardFormValues => {
  const cards = normalizeCards(r.cards);
  return {
    grade: fromGrade(r.grade),
    school_class: r.school_class,
    topic: r.topic,
    title: r.title,
    cards: cards.length ? cards : EMPTY.cards,
    description: r.description ?? "",
    is_active: r.is_active,
  };
};

export function FlashcardDeckFormModal({ open, editing, onCancel, onSubmit, canUseAi }: FlashcardDeckFormModalProps) {
  const t = useTranslations("flashcardDecks");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<FlashcardFormValues>({ defaultValues: EMPTY });
  const aiDraft = useFlashcardAiDraftMutation();
  const isEditing = Boolean(editing);
  const schoolClass = useMemo(() => (editing ? { id: editing.school_class, name: editing.school_class_name } : null), [editing]);

  useEffect(() => {
    if (!open) return;
    form.reset(editing ? toValues(editing) : EMPTY);
  }, [open, editing, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      size="lg"
      title={isEditing ? t("form.editTitle") : t("form.createTitle")}
      form={form}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.createTitle")}
      footerExtra={
        canUseAi && (
          <AiDraftButton
            pending={aiDraft.isPending}
            getScope={() => form.getValues()}
            hasContent={() => Boolean(form.getValues("title").trim()) || cardsPayload(form.getValues("cards")).length > 0}
            onMissingScope={() => void form.trigger(["grade", "topic"])}
            request={aiDraft.mutateAsync}
            apply={(draft) => {
              const cards = normalizeCards(draft.cards);
              form.setValue("title", draft.title, { shouldDirty: true });
              form.setValue("cards", cards.length ? cards : EMPTY.cards, { shouldDirty: true });
            }}
          />
        )
      }
      onSubmit={(values) =>
        onSubmit({
          ...scopePayload(values),
          title: values.title.trim(),
          cards: cardsPayload(values.cards),
          description: values.description.trim() || null,
          is_active: values.is_active,
        })
      }
    >
      <FormSection>
        <ScopeFields<FlashcardFormValues> schoolClass={schoolClass} />
        <TextField<FlashcardFormValues>
          name="title"
          label={t("fields.title")}
          placeholder={t("form.titlePlaceholder")}
          className="form-section__full"
          rules={{ required: tv("required", { field: t("fields.title") }), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <FlashcardCardsField />
        <TextareaField<FlashcardFormValues> name="description" label={tc("fields.description")} maxLength={500} className="form-section__full" />
        <SwitchField<FlashcardFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
      </FormSection>
    </FormDialog>
  );
}
