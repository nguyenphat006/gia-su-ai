"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { EntityComboField, FormDialog, FormSection, SelectField, SwitchField, TextField, TextareaField } from "@/components/form";
import type { Schemas } from "@/types/api";
import { activeTeacherSource } from "../../shared/entitySources";
import { gradeOptions, type Grade } from "../../shared/grades";
import type { SchoolClassCreateInput, SchoolClassItem, SchoolClassUpdateInput } from "../types";

interface SchoolClassFormValues {
  code: string;
  name: string;
  grade: string;
  academic_year: string;
  homeroom_teacher: number | null;
  description: string;
  is_active: boolean;
}

interface SchoolClassFormModalProps {
  open: boolean;
  editing: SchoolClassItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: SchoolClassCreateInput | SchoolClassUpdateInput) => Promise<void>;
  loading?: boolean;
}

const EMPTY: SchoolClassFormValues = { code: "", name: "", grade: "", academic_year: "", homeroom_teacher: null, description: "", is_active: true };

const toValues = (r: SchoolClassItem): SchoolClassFormValues => ({
  code: r.code,
  name: r.name,
  grade: String(r.grade),
  academic_year: r.academic_year,
  homeroom_teacher: r.homeroom_teacher,
  description: r.description || "",
  is_active: r.is_active ?? true,
});

export function SchoolClassFormModal({ open, editing, onCancel, onSubmit }: SchoolClassFormModalProps) {
  const t = useTranslations("schoolClasses");
  const ta = useTranslations("academics");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<SchoolClassFormValues>({ defaultValues: EMPTY });
  const isEditing = Boolean(editing);
  const grades = useMemo(() => gradeOptions(ta), [ta]);
  const teacherInitial = useMemo(
    () => (editing?.homeroom_teacher ? [{ value: String(editing.homeroom_teacher), label: editing.homeroom_teacher_name }] : []),
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
      title={isEditing ? t("form.editTitle", { code: editing?.code ?? "" }) : t("form.createTitle")}
      form={form}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.createTitle")}
      onSubmit={async (values) => {
        const common: SchoolClassUpdateInput = {
          name: values.name.trim(),
          grade: Number(values.grade) as Grade,
          academic_year: values.academic_year.trim(),
          homeroom_teacher: values.homeroom_teacher,
          description: values.description?.trim() || "",
          is_active: values.is_active,
        };
        await onSubmit(isEditing ? common : { ...common, code: values.code.trim().toUpperCase() });
      }}
    >
      <FormSection>
        <TextField<SchoolClassFormValues>
          name="code"
          label={t("fields.code")}
          disabled={isEditing}
          transform={(v) => v.toUpperCase()}
          inputClassName="font-mono font-semibold"
          rules={{
            required: isEditing ? false : tv("required", { field: t("fields.code") }),
            pattern: { value: /^[A-Z0-9_-]+$/, message: t("form.codeFormat") },
            maxLength: { value: 50, message: tv("maxLength", { max: 50 }) },
          }}
        />
        <TextField<SchoolClassFormValues>
          name="name"
          label={t("fields.name")}
          placeholder={t("form.namePlaceholder")}
          rules={{ required: tv("required", { field: t("fields.name") }), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <SelectField<SchoolClassFormValues> name="grade" label={ta("gradeLabel")} options={grades} rules={{ required: t("form.gradeRequired") }} />
        <TextField<SchoolClassFormValues>
          name="academic_year"
          label={ta("academicYear")}
          placeholder={t("form.academicYearPlaceholder")}
          rules={{
            required: tv("required", { field: ta("academicYear") }),
            pattern: { value: /^\d{4}-\d{4}$/, message: t("form.academicYearFormat") },
          }}
        />
        <EntityComboField<SchoolClassFormValues, Schemas["Teacher"]>
          name="homeroom_teacher"
          label={t("fields.homeroomTeacher")}
          placeholder={t("form.homeroomTeacherPlaceholder")}
          className="form-section__full"
          initialOptions={teacherInitial}
          {...activeTeacherSource}
        />
        <TextareaField<SchoolClassFormValues> name="description" label={tc("fields.description")} maxLength={500} className="form-section__full" />
        <SwitchField<SchoolClassFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
      </FormSection>
    </FormDialog>
  );
}
