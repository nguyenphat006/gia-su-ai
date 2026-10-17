"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { ComboboxField, FormDialog, FormSection, SwitchField, TextField, TextareaField } from "@/components/form";
import { gradeOptions } from "@/modules/academics/shared/grades";
import { fromGrade, toGradePayload } from "@/modules/revision/shared/scope";
import type { KnowledgeChunkCreateInput, KnowledgeChunkItem } from "../types";

interface KnowledgeChunkFormValues {
  title: string;
  content: string;
  grade: string | null;
  topic: string;
  description: string;
  is_active: boolean;
}

interface KnowledgeChunkFormModalProps {
  open: boolean;
  editing: KnowledgeChunkItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: KnowledgeChunkCreateInput) => Promise<void>;
}

const CONTENT_MIN = 20;
const EMPTY: KnowledgeChunkFormValues = { title: "", content: "", grade: null, topic: "", description: "", is_active: true };

const toValues = (r: KnowledgeChunkItem): KnowledgeChunkFormValues => ({
  title: r.title,
  content: r.content,
  grade: fromGrade(r.grade),
  topic: r.topic ?? "",
  description: r.description ?? "",
  is_active: r.is_active,
});

export function KnowledgeChunkFormModal({ open, editing, onCancel, onSubmit }: KnowledgeChunkFormModalProps) {
  const t = useTranslations("knowledgeChunks");
  const tr = useTranslations("revision");
  const ta = useTranslations("academics");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<KnowledgeChunkFormValues>({ defaultValues: EMPTY });
  const grades = useMemo(() => gradeOptions(ta), [ta]);
  const isEditing = Boolean(editing);

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
      onSubmit={(values) =>
        onSubmit({
          title: values.title.trim(),
          content: values.content.trim(),
          grade: toGradePayload(values.grade),
          topic: values.topic.trim() || null,
          description: values.description.trim() || null,
          is_active: values.is_active,
        })
      }
    >
      <FormSection>
        <TextField<KnowledgeChunkFormValues>
          name="title"
          label={t("fields.title")}
          placeholder={t("form.titlePlaceholder")}
          className="form-section__full"
          rules={{ required: tv("required", { field: t("fields.title") }), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <TextareaField<KnowledgeChunkFormValues>
          name="content"
          label={t("fields.content")}
          placeholder={t("form.contentPlaceholder")}
          hint={isEditing ? t("form.contentHint") : undefined}
          rows={8}
          className="form-section__full"
          rules={{
            required: tv("required", { field: t("fields.content") }),
            validate: (v) => String(v ?? "").trim().length >= CONTENT_MIN || t("form.contentMin", { min: CONTENT_MIN }),
          }}
        />
        <ComboboxField<KnowledgeChunkFormValues>
          name="grade"
          label={tr("fields.grade")}
          options={grades}
          allowClear
          placeholder={tr("sharedGrade")}
          hint={tr("form.gradeHint")}
        />
        <TextField<KnowledgeChunkFormValues>
          name="topic"
          label={tr("fields.topic")}
          placeholder={tr("form.topicPlaceholder")}
          rules={{ maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <TextareaField<KnowledgeChunkFormValues> name="description" label={tc("fields.description")} maxLength={500} className="form-section__full" />
        <SwitchField<KnowledgeChunkFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
      </FormSection>
    </FormDialog>
  );
}
