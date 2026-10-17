"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { FormDialog, FormSection, SwitchField, TextField, TextareaField } from "@/components/form";
import type { SupplierCreateInput, SupplierItem, SupplierUpdateInput } from "../types";

interface SupplierFormValues {
  supplier_code: string;
  supplier_name: string;
  tax_code: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  is_active: boolean;
}

interface SupplierFormModalProps {
  open: boolean;
  editing: SupplierItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: SupplierCreateInput | SupplierUpdateInput) => Promise<void>;
  loading?: boolean;
}

const EMPTY: SupplierFormValues = { supplier_code: "", supplier_name: "", tax_code: "", phone: "", email: "", address: "", description: "", is_active: true };

const toValues = (s: SupplierItem): SupplierFormValues => ({
  supplier_code: s.supplier_code,
  supplier_name: s.supplier_name,
  tax_code: s.tax_code ?? "",
  phone: s.phone ?? "",
  email: s.email ?? "",
  address: s.address ?? "",
  description: s.description ?? "",
  is_active: s.is_active ?? true,
});

export function SupplierFormModal({ open, editing, onCancel, onSubmit }: SupplierFormModalProps) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<SupplierFormValues>({ defaultValues: EMPTY });
  const isEditing = Boolean(editing);

  useEffect(() => {
    if (open) form.reset(editing ? toValues(editing) : EMPTY);
  }, [open, editing, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      title={isEditing ? t("form.editTitle", { code: editing?.supplier_code ?? "" }) : t("form.createTitle")}
      form={form}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.createTitle")}
      onSubmit={async (values) => {
        const common = {
          supplier_name: values.supplier_name.trim(),
          tax_code: values.tax_code.trim() || null,
          phone: values.phone.trim() || null,
          email: values.email.trim() || null,
          address: values.address.trim() || null,
          description: values.description.trim(),
          is_active: values.is_active,
        };
        await onSubmit(isEditing ? common : { ...common, supplier_code: values.supplier_code.trim().toUpperCase() });
      }}
    >
      <FormSection>
        <TextField<SupplierFormValues>
          name="supplier_code"
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
        <TextField<SupplierFormValues>
          name="supplier_name"
          label={t("fields.name")}
          rules={{ required: tv("required", { field: t("fields.name") }), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <TextField<SupplierFormValues> name="tax_code" label={t("fields.taxCode")} rules={{ maxLength: { value: 50, message: tv("maxLength", { max: 50 }) } }} />
        <TextField<SupplierFormValues> name="phone" label={t("fields.phone")} type="tel" rules={{ maxLength: { value: 50, message: tv("maxLength", { max: 50 }) } }} />
        <TextField<SupplierFormValues>
          name="email"
          label={t("fields.email")}
          type="email"
          rules={{ pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t("form.emailInvalid") }, maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <SwitchField<SupplierFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
        <TextField<SupplierFormValues>
          name="address"
          label={t("fields.address")}
          className="form-section__full"
          rules={{ maxLength: { value: 500, message: tv("maxLength", { max: 500 }) } }}
        />
        <TextareaField<SupplierFormValues> name="description" label={tc("fields.description")} maxLength={500} className="form-section__full" />
      </FormSection>
    </FormDialog>
  );
}
