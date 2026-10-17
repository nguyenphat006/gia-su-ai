"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { FormDialog, FormSection, SwitchField, TextField, TextareaField } from "@/components/form";
import { AccountFields, accountPayload, type AccountFormValues } from "../../shared/AccountFields";
import type { TeacherCreateInput, TeacherItem, TeacherUpdateInput } from "../types";

interface TeacherFormValues extends AccountFormValues {
  employee_code: string;
  subject: string;
  description: string;
  is_active: boolean;
}

interface TeacherFormModalProps {
  open: boolean;
  editing: TeacherItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: TeacherCreateInput | TeacherUpdateInput) => Promise<void>;
  loading?: boolean;
}

const EMPTY: TeacherFormValues = { username: "", full_name: "", email: "", password: "", employee_code: "", subject: "", description: "", is_active: true };

const toValues = (r: TeacherItem): TeacherFormValues => ({
  username: r.username,
  full_name: r.full_name,
  email: r.email || "",
  password: "",
  employee_code: r.employee_code || "",
  subject: r.subject || "",
  description: r.description || "",
  is_active: r.is_active ?? true,
});

export function TeacherFormModal({ open, editing, onCancel, onSubmit }: TeacherFormModalProps) {
  const t = useTranslations("teachers");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<TeacherFormValues>({ defaultValues: EMPTY });
  const isEditing = Boolean(editing);

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
          employee_code: values.employee_code.trim() || null,
          subject: values.subject.trim() || null,
          description: values.description?.trim() || "",
          is_active: values.is_active,
        });
      }}
    >
      <FormSection>
        <AccountFields isEditing={isEditing} usernameRequired />
        <TextField<TeacherFormValues>
          name="employee_code"
          label={t("fields.employeeCode")}
          inputClassName="font-mono"
          rules={{ maxLength: { value: 50, message: tv("maxLength", { max: 50 }) } }}
        />
        <TextField<TeacherFormValues>
          name="subject"
          label={t("fields.subject")}
          placeholder={t("form.subjectPlaceholder")}
          rules={{ maxLength: { value: 100, message: tv("maxLength", { max: 100 }) } }}
        />
        <TextareaField<TeacherFormValues> name="description" label={tc("fields.description")} maxLength={500} className="form-section__full" />
        <SwitchField<TeacherFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
      </FormSection>
    </FormDialog>
  );
}
