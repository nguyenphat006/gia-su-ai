"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { FormDialog, FormSection, SelectField, SwitchField, TextField, TextareaField } from "@/components/form";
import type { AiSettingCreateInput, AiSettingItem, AiSettingUpdateInput, AiSettingValueType } from "../types";
import { AiSettingValueField } from "./AiSettingValueField";

export const VALUE_TYPES: readonly AiSettingValueType[] = ["TEXT", "PROMPT", "NUMBER", "BOOLEAN"];

interface AiSettingFormValues {
  key: string;
  label: string;
  value: string;
  value_type: AiSettingValueType;
  description: string;
  is_active: boolean;
}

interface AiSettingFormModalProps {
  open: boolean;
  editing: AiSettingItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: AiSettingCreateInput | AiSettingUpdateInput) => Promise<void>;
  loading?: boolean;
  readOnly?: boolean;
}

const EMPTY: AiSettingFormValues = { key: "", label: "", value: "", value_type: "TEXT", description: "", is_active: true };

const toValues = (r: AiSettingItem): AiSettingFormValues => ({
  key: r.key,
  label: r.label,
  value: r.value,
  value_type: r.value_type,
  description: r.description || "",
  is_active: r.is_active ?? true,
});

export function AiSettingFormModal({ open, editing, onCancel, onSubmit, readOnly }: AiSettingFormModalProps) {
  const t = useTranslations("aiSettings");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<AiSettingFormValues>({ defaultValues: EMPTY });
  const isEditing = Boolean(editing);
  const isSystem = Boolean(editing?.is_system);
  const valueType = useWatch({ control: form.control, name: "value_type" });
  const description = useWatch({ control: form.control, name: "description" });
  const typeOptions = useMemo(() => VALUE_TYPES.map((v) => ({ value: v, label: t(`valueTypes.${v}`) })), [t]);

  useEffect(() => {
    if (!open) return;
    form.reset(editing ? toValues(editing) : EMPTY);
  }, [open, editing, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      title={isEditing ? t("form.editTitle", { code: editing?.key ?? "" }) : t("form.createTitle")}
      form={form}
      size={valueType === "PROMPT" ? "lg" : "md"}
      readOnly={readOnly}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.createTitle")}
      onSubmit={async (values) => {
        const payload: AiSettingUpdateInput = {
          label: values.label.trim(),
          value: values.value_type === "BOOLEAN" ? (values.value === "true" ? "true" : "false") : values.value,
          value_type: values.value_type,
          description: values.description?.trim() || "",
          is_active: values.is_active,
        };
        // Khóa hệ thống: không gửi key / value_type (backend chặn đổi khóa)
        if (isSystem) {
          delete payload.value_type;
          await onSubmit(payload);
        } else {
          await onSubmit({ ...payload, key: values.key.trim().toUpperCase() } as AiSettingCreateInput);
        }
      }}
    >
      <FormSection>
        <TextField<AiSettingFormValues>
          name="key"
          label={t("fields.key")}
          disabled={isSystem}
          hint={isSystem ? t("form.systemKeyHint") : undefined}
          transform={(v) => v.toUpperCase()}
          inputClassName="font-mono font-semibold"
          rules={{
            required: isSystem ? false : tv("required", { field: t("fields.key") }),
            pattern: { value: /^[A-Z0-9_]+$/, message: t("form.keyFormat") },
            maxLength: { value: 100, message: tv("maxLength", { max: 100 }) },
          }}
        />
        <TextField<AiSettingFormValues>
          name="label"
          label={t("fields.label")}
          rules={{ required: tv("required", { field: t("fields.label") }), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <SelectField<AiSettingFormValues> name="value_type" label={t("fields.valueType")} options={typeOptions} disabled={isSystem} />
        <SwitchField<AiSettingFormValues>
          name="is_active"
          label={tc("fields.status")}
          disabled={isSystem}
          onText={tc("status.active")}
          offText={tc("status.inactive")}
        />
        <AiSettingValueField valueType={valueType} hint={valueType === "PROMPT" ? description : null} />
        <TextareaField<AiSettingFormValues> name="description" label={t("fields.description")} rows={2} maxLength={1000} className="form-section__full" />
      </FormSection>
    </FormDialog>
  );
}
