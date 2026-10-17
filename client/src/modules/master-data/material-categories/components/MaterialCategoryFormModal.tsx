"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { FormDialog, SwitchField, TextField, TextareaField, TreeSelectField } from "@/components/form";
import type { TreeNode } from "@/components/controls/TreeSelect";
import type {
  MaterialCategoryItem,
  MaterialCategoryCreateInput,
  MaterialCategoryUpdateInput,
  MaterialCategoryTreeItem,
} from "../types";

interface CategoryFormValues {
  code: string;
  name: string;
  parent: number | null;
  description: string;
  is_active: boolean;
}

interface MaterialCategoryFormModalProps {
  open: boolean;
  editingCategory: MaterialCategoryItem | null;
  categoryTree: MaterialCategoryTreeItem[];
  onCancel: () => void;
  onSubmit: (values: MaterialCategoryCreateInput | MaterialCategoryUpdateInput) => Promise<void>;
  loading?: boolean;
}

const EMPTY: CategoryFormValues = { code: "", name: "", parent: null, description: "", is_active: true };

/** Cây nhóm cha; khi sửa: khóa chính nhóm đang sửa và toàn bộ nhánh con (chống vòng lặp cha-con) */
function toTree(nodes: MaterialCategoryTreeItem[], lockedId?: number, locked = false): TreeNode[] {
  return nodes.map((n) => {
    const isLocked = locked || n.id === lockedId;
    return {
      value: String(n.id),
      label: `${n.code} - ${n.name}`,
      disabled: isLocked,
      children: n.children?.length ? toTree(n.children, lockedId, isLocked) : undefined,
    };
  });
}

export function MaterialCategoryFormModal({ open, editingCategory, categoryTree, onCancel, onSubmit }: MaterialCategoryFormModalProps) {
  const t = useTranslations("materialCategories");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<CategoryFormValues>({ defaultValues: EMPTY });
  const isEditing = Boolean(editingCategory);
  const tree = useMemo(() => toTree(categoryTree, editingCategory?.id), [categoryTree, editingCategory]);

  useEffect(() => {
    if (!open) return;
    form.reset(
      editingCategory
        ? {
            code: editingCategory.code,
            name: editingCategory.name,
            parent: editingCategory.parent ?? null,
            description: editingCategory.description || "",
            is_active: editingCategory.is_active,
          }
        : EMPTY,
    );
  }, [open, editingCategory, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      title={isEditing ? t("form.editTitle", { code: editingCategory?.code ?? "" }) : t("form.createTitle")}
      description={isEditing ? undefined : t("form.createDescription")}
      size="sm"
      form={form}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.submitCreate")}
      onSubmit={async (values) => {
        const common = {
          name: values.name.trim(),
          parent: values.parent || null,
          description: values.description?.trim() || "",
          is_active: values.is_active,
        };
        await onSubmit(isEditing ? common : { code: values.code.toUpperCase().trim(), ...common });
      }}
    >
      <TextField<CategoryFormValues>
        name="code"
        label={t("fields.code")}
        placeholder={t("form.codePlaceholder")}
        disabled={isEditing}
        transform={(v) => v.toUpperCase()}
        inputClassName="font-mono font-semibold"
        hint={t("form.codeHint")}
        rules={{
          required: isEditing ? false : tv("required", { field: t("fields.code") }),
          pattern: { value: /^[A-Z0-9_]+$/, message: tv("codeFormat") },
          maxLength: { value: 50, message: tv("maxLength", { max: 50 }) },
        }}
      />
      <TextField<CategoryFormValues>
        name="name"
        label={t("fields.name")}
        placeholder={t("form.namePlaceholder")}
        rules={{ required: tv("required", { field: t("fields.name") }), maxLength: { value: 100, message: tv("maxLength", { max: 100 }) } }}
      />
      <TreeSelectField<CategoryFormValues> name="parent" label={t("fields.parent")} tree={tree} numeric allowClear placeholder={t("form.parentPlaceholder")} />
      <TextareaField<CategoryFormValues> name="description" label={tc("fields.description")} placeholder={t("form.descriptionPlaceholder")} maxLength={255} />
      <SwitchField<CategoryFormValues>
        name="is_active"
        label={tc("fields.status")}
        onText={tc("status.active")}
        offText={tc("status.inactive")}
        hint={t("form.statusHint")}
      />
    </FormDialog>
  );
}

export default MaterialCategoryFormModal;
