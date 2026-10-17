"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { statusOptions } from "@/components/common/StatusBadge";
import { FormDialog, FormSection, SelectField, SwitchField, TextareaField } from "@/components/form";
import { ScopeFields } from "../../shared/ScopeFields";
import { buildQuestionPayload, EMPTY_QUESTION, toQuestionValues, type QuestionFormValues } from "../questionPayload";
import { DIFFICULTY, QUESTION_STATUS, QUESTION_TYPE } from "../questionStatus";
import type { QuestionCreateInput, QuestionItem } from "../types";
import { QuestionOptionsField } from "./QuestionOptionsField";

interface QuestionFormModalProps {
  open: boolean;
  editing: QuestionItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: QuestionCreateInput) => Promise<void>;
}

const CONTENT_MIN = 5;

export function QuestionFormModal({ open, editing, onCancel, onSubmit }: QuestionFormModalProps) {
  const t = useTranslations("questions");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const tr = useTranslations();
  const form = useForm<QuestionFormValues>({ defaultValues: EMPTY_QUESTION });
  const questionType = useWatch({ control: form.control, name: "question_type" });
  const isEditing = Boolean(editing);
  const typeOptions = useMemo(() => statusOptions(QUESTION_TYPE, tr), [tr]);
  const difficultyOptions = useMemo(() => statusOptions(DIFFICULTY, tr), [tr]);
  const statusOpts = useMemo(() => statusOptions(QUESTION_STATUS, tr), [tr]);
  const schoolClass = useMemo(() => (editing ? { id: editing.school_class, name: editing.school_class_name } : null), [editing]);

  useEffect(() => {
    if (!open) return;
    form.reset(editing ? toQuestionValues(editing) : EMPTY_QUESTION);
  }, [open, editing, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      size="lg"
      title={isEditing ? t("form.editTitle") : t("form.createTitle")}
      form={form}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.createTitle")}
      onSubmit={(values) => onSubmit(buildQuestionPayload(values))}
    >
      <FormSection>
        <ScopeFields<QuestionFormValues> schoolClass={schoolClass} />
        <SelectField<QuestionFormValues> name="question_type" label={t("fields.questionType")} options={typeOptions} />
        <SelectField<QuestionFormValues> name="difficulty" label={t("fields.difficulty")} options={difficultyOptions} />
        <TextareaField<QuestionFormValues>
          name="content"
          label={t("fields.content")}
          rows={3}
          maxLength={2000}
          className="form-section__full"
          rules={{
            required: tv("required", { field: t("fields.content") }),
            validate: (v) => String(v ?? "").trim().length >= CONTENT_MIN || t("form.contentMin", { min: CONTENT_MIN }),
          }}
        />
        {questionType === "MULTIPLE_CHOICE" ? (
          <QuestionOptionsField />
        ) : (
          <TextareaField<QuestionFormValues>
            name="sample_answer"
            label={t("fields.sampleAnswer")}
            rows={4}
            maxLength={4000}
            className="form-section__full"
            rules={{ validate: (v, all) => all.question_type !== "ESSAY" || Boolean(String(v ?? "").trim()) || tv("required", { field: t("fields.sampleAnswer") }) }}
          />
        )}
        <TextareaField<QuestionFormValues> name="explanation" label={t("fields.explanation")} rows={2} maxLength={2000} className="form-section__full" />
        <TextareaField<QuestionFormValues> name="hint" label={t("fields.hint")} rows={2} maxLength={1000} className="form-section__full" />
        <SelectField<QuestionFormValues> name="status" label={t("fields.status")} options={statusOpts} />
        <SwitchField<QuestionFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
      </FormSection>
    </FormDialog>
  );
}
