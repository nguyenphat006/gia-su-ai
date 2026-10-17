"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { EntityComboField, FormDialog, FormSection, SelectField, SwitchField, TextField, TextareaField } from "@/components/form";
import type { Schemas } from "@/types/api";
import { AccountFields, accountPayload, type AccountFormValues } from "../../shared/AccountFields";
import { schoolClassSource } from "../../shared/entitySources";
import { gradeOptions, type Grade } from "../../shared/grades";
import type { StudentCreateInput, StudentItem, StudentUpdateInput } from "../types";

interface StudentFormValues extends AccountFormValues {
  student_code: string;
  grade: string;
  school_class: number | null;
  description: string;
  is_active: boolean;
}

interface StudentFormModalProps {
  open: boolean;
  editing: StudentItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: StudentCreateInput | StudentUpdateInput) => Promise<void>;
  loading?: boolean;
}

const EMPTY: StudentFormValues = {
  username: "",
  full_name: "",
  email: "",
  password: "",
  student_code: "",
  grade: "",
  school_class: null,
  description: "",
  is_active: true,
};

const toValues = (r: StudentItem): StudentFormValues => ({
  username: r.username,
  full_name: r.full_name,
  email: r.email || "",
  password: "",
  student_code: r.student_code,
  grade: String(r.grade),
  school_class: r.school_class,
  description: r.description || "",
  is_active: r.is_active ?? true,
});

export function StudentFormModal({ open, editing, onCancel, onSubmit }: StudentFormModalProps) {
  const t = useTranslations("students");
  const ta = useTranslations("academics");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<StudentFormValues>({ defaultValues: EMPTY });
  const isEditing = Boolean(editing);
  const grades = useMemo(() => gradeOptions(ta), [ta]);
  const classInitial = useMemo(
    () => (editing?.school_class ? [{ value: String(editing.school_class), label: editing.school_class_name }] : []),
    [editing],
  );

  useEffect(() => {
    if (!open) return;
    form.reset(editing ? toValues(editing) : EMPTY);
  }, [open, editing, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      title={isEditing ? t("form.editTitle", { name: editing?.full_name ?? "" }) : t("form.createTitle")}
      form={form}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.createTitle")}
      onSubmit={async (values) => {
        await onSubmit({
          ...accountPayload(values, isEditing),
          student_code: values.student_code.trim(),
          grade: Number(values.grade) as Grade,
          school_class: values.school_class,
          description: values.description?.trim() || "",
          is_active: values.is_active,
        });
      }}
    >
      <FormSection>
        <TextField<StudentFormValues>
          name="student_code"
          label={t("fields.studentCode")}
          inputClassName="font-mono font-semibold"
          rules={{ required: t("form.studentCodeRequired"), maxLength: { value: 50, message: tv("maxLength", { max: 50 }) } }}
        />
        <AccountFields isEditing={isEditing} usernameHint={t("form.usernameHint")} />
        <SelectField<StudentFormValues> name="grade" label={ta("gradeLabel")} options={grades} rules={{ required: t("form.gradeRequired") }} />
        <EntityComboField<StudentFormValues, Schemas["SchoolClass"]>
          name="school_class"
          label={t("fields.schoolClass")}
          placeholder={t("form.schoolClassPlaceholder")}
          initialOptions={classInitial}
          {...schoolClassSource}
        />
        <TextareaField<StudentFormValues> name="description" label={tc("fields.description")} maxLength={500} className="form-section__full" />
        <SwitchField<StudentFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
      </FormSection>
    </FormDialog>
  );
}
