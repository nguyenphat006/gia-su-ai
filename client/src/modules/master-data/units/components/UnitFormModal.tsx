"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { FormDialog, SwitchField, TextField, TextareaField } from "@/components/form";
import type { UnitOfMeasureItem, UnitCreateInput, UnitUpdateInput } from "../types";

interface UnitFormValues {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface UnitFormModalProps {
  open: boolean;
  editingUnit: UnitOfMeasureItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: lỗi theo trường tự gắn vào ô nhập (FormDialog) */
  onSubmit: (values: UnitCreateInput | UnitUpdateInput) => Promise<void>;
  loading?: boolean;
}

const EMPTY: UnitFormValues = { code: "", name: "", description: "", is_active: true };

export function UnitFormModal({ open, editingUnit, onCancel, onSubmit }: UnitFormModalProps) {
  const t = useTranslations("units");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<UnitFormValues>({ defaultValues: EMPTY });
  const isEditing = Boolean(editingUnit);

  useEffect(() => {
    if (!open) return;
    form.reset(
      editingUnit
        ? { code: editingUnit.code, name: editingUnit.name, description: editingUnit.description || "", is_active: editingUnit.is_active }
        : EMPTY,
    );
  }, [open, editingUnit, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      title={isEditing ? t("form.editTitle", { code: editingUnit?.code ?? "" }) : t("form.createTitle")}
      description={isEditing ? undefined : t("form.createDescription")}
      size="sm"
      form={form}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.createTitle")}
      onSubmit={async (values) => {
        const common = { name: values.name.trim(), description: values.description?.trim() || "", is_active: values.is_active };
        await onSubmit(isEditing ? common : { code: values.code.toUpperCase().trim(), ...common });
      }}
    >
      <TextField<UnitFormValues>
        name="code"
        label={tc("fields.code")}
        placeholder={t("form.codePlaceholder")}
        disabled={isEditing}
        transform={(v) => v.toUpperCase()}
        inputClassName="font-mono font-semibold"
        hint={t("form.codeHint")}
        rules={{
          required: isEditing ? false : tv("required", { field: tc("fields.code") }),
          pattern: { value: /^[A-Z0-9_]+$/, message: tv("codeFormat") },
          maxLength: { value: 20, message: tv("maxLength", { max: 20 }) },
        }}
      />
      <TextField<UnitFormValues>
        name="name"
        label={t("fields.name")}
        placeholder={t("form.namePlaceholder")}
        rules={{ required: tv("required", { field: t("fields.name") }), maxLength: { value: 100, message: tv("maxLength", { max: 100 }) } }}
      />
      <TextareaField<UnitFormValues> name="description" label={tc("fields.description")} placeholder={t("form.descriptionPlaceholder")} maxLength={255} />
      <SwitchField<UnitFormValues>
        name="is_active"
        label={tc("fields.status")}
        onText={tc("status.active")}
        offText={tc("status.inactive")}
        hint={t("form.statusHint")}
      />
    </FormDialog>
  );
}
