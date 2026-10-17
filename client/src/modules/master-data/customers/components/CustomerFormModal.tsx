"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useController, useForm } from "react-hook-form";
import { ImageUpload } from "@/components/controls/ImageUpload";
import { CountryField, FieldShell, FormDialog, FormSection, SwitchField, TextField, TextareaField } from "@/components/form";
import { customerService } from "../services/customer.service";
import type { CustomerCreateInput, CustomerItem, CustomerUpdateInput } from "../types";

interface CustomerFormValues {
  customer_code: string;
  customer_name: string;
  country: string;
  logo_url: string;
  description: string;
  is_active: boolean;
}

interface CustomerFormModalProps {
  open: boolean;
  editing: CustomerItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: CustomerCreateInput | CustomerUpdateInput) => Promise<void>;
  loading?: boolean;
}

const EMPTY: CustomerFormValues = { customer_code: "", customer_name: "", country: "", logo_url: "", description: "", is_active: true };

const toValues = (c: CustomerItem): CustomerFormValues => ({
  customer_code: c.customer_code,
  customer_name: c.customer_name,
  country: c.country ?? "",
  logo_url: c.logo_url ?? "",
  description: c.description ?? "",
  is_active: c.is_active ?? true,
});

export function CustomerFormModal({ open, editing, onCancel, onSubmit }: CustomerFormModalProps) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<CustomerFormValues>({ defaultValues: EMPTY });
  const logo = useController({ control: form.control, name: "logo_url" });
  const isEditing = Boolean(editing);

  useEffect(() => {
    if (open) form.reset(editing ? toValues(editing) : EMPTY);
  }, [open, editing, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      title={isEditing ? t("form.editTitle", { code: editing?.customer_code ?? "" }) : t("form.createTitle")}
      form={form}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.createTitle")}
      onSubmit={async (values) => {
        const common = {
          customer_name: values.customer_name.trim(),
          country: values.country || null,
          logo_url: values.logo_url || null,
          description: values.description.trim(),
          is_active: values.is_active,
        };
        // Mã khách hàng nằm trong SKU biến thể → không đổi sau khi tạo
        await onSubmit(isEditing ? common : { ...common, customer_code: values.customer_code.trim().toUpperCase() });
      }}
    >
      <FormSection>
        <TextField<CustomerFormValues>
          name="customer_code"
          label={t("fields.code")}
          disabled={isEditing}
          transform={(v) => v.toUpperCase()}
          inputClassName="font-mono font-semibold"
          hint={t("form.codeHint")}
          rules={{
            required: isEditing ? false : tv("required", { field: t("fields.code") }),
            pattern: { value: /^[A-Z0-9_]+$/, message: t("form.codeFormat") },
            maxLength: { value: 50, message: tv("maxLength", { max: 50 }) },
          }}
        />
        <TextField<CustomerFormValues>
          name="customer_name"
          label={t("fields.name")}
          rules={{ required: tv("required", { field: t("fields.name") }), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <CountryField<CustomerFormValues> name="country" label={t("fields.country")} placeholder={t("form.countryPlaceholder")} />
        <SwitchField<CustomerFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
        <FieldShell id="f-logo_url" label={t("fields.logo")} className="form-section__full">
          <ImageUpload value={logo.field.value} onChange={logo.field.onChange} upload={customerService.uploadLogo} hint={t("form.logoFormats")} alt={t("form.logoAlt")} />
        </FieldShell>
        <TextareaField<CustomerFormValues> name="description" label={tc("fields.description")} maxLength={500} className="form-section__full" />
      </FormSection>
    </FormDialog>
  );
}
