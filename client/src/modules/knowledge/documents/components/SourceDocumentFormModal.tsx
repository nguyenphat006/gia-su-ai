"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { ComboboxField, FormDialog, FormSection, SwitchField, TextField, TextareaField } from "@/components/form";
import { gradeOptions } from "@/modules/academics/shared/grades";
import { fromGrade, toGradePayload } from "@/modules/revision/shared/scope";
import type { SourceDocumentItem, SourceDocumentUpdateInput } from "../types";

interface SourceDocumentFormValues {
  title: string;
  grade: string | null;
  topic: string;
  description: string;
  is_active: boolean;
}

interface SourceDocumentFormModalProps {
  open: boolean;
  editing: SourceDocumentItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: SourceDocumentUpdateInput) => Promise<void>;
}

const EMPTY: SourceDocumentFormValues = { title: "", grade: null, topic: "", description: "", is_active: true };

/** Sửa thông tin mô tả tài liệu (nội dung đi theo tệp đã tải lên, không sửa được) */
export function SourceDocumentFormModal({ open, editing, onCancel, onSubmit }: SourceDocumentFormModalProps) {
  const t = useTranslations("sourceDocuments");
  const tr = useTranslations("revision");
  const ta = useTranslations("academics");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<SourceDocumentFormValues>({ defaultValues: EMPTY });
  const grades = useMemo(() => gradeOptions(ta), [ta]);

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? { title: editing.title, grade: fromGrade(editing.grade), topic: editing.topic ?? "", description: editing.description ?? "", is_active: editing.is_active }
        : EMPTY,
    );
  }, [open, editing, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      title={t("form.editTitle")}
      form={form}
      submitText={tc("actions.saveChanges")}
      onSubmit={(values) =>
        onSubmit({
          title: values.title.trim(),
          grade: toGradePayload(values.grade),
          topic: values.topic.trim() || null,
          description: values.description.trim() || null,
          is_active: values.is_active,
        })
      }
    >
      <FormSection>
        <TextField<SourceDocumentFormValues>
          name="title"
          label={t("fields.title")}
          className="form-section__full"
          rules={{ required: tv("required", { field: t("fields.title") }), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <ComboboxField<SourceDocumentFormValues> name="grade" label={tr("fields.grade")} options={grades} allowClear placeholder={tr("sharedGrade")} />
        <TextField<SourceDocumentFormValues> name="topic" label={tr("fields.topic")} rules={{ maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }} />
        <TextareaField<SourceDocumentFormValues> name="description" label={tc("fields.description")} maxLength={500} className="form-section__full" />
        <SwitchField<SourceDocumentFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
      </FormSection>
    </FormDialog>
  );
}
