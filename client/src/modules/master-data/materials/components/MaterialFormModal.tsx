"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useController, useForm, useWatch } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { EntityComboField, FieldShell, FormDialog, FormSection, SwitchField, TextField, TextareaField, TreeSelectField } from "@/components/form";
import { ImageUpload } from "@/components/controls/ImageUpload";
import type { TreeNode } from "@/components/controls/TreeSelect";
import { unitService } from "../../units/services/unit.service";
import type { MaterialCategoryTreeItem } from "../../material-categories/types";
import { materialService } from "../services/material.service";
import type { MaterialFormValues, MaterialItem } from "../types";
import { MetalSpecSection, StandardSpecPlaceholder } from "./material-form/MetalSpecSection";
import { buildMaterialName, DEFAULT_METAL_SPEC, type MetalSpecFormValue } from "./material-form/metalSpecUtils";

interface MaterialFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: MaterialFormValues) => Promise<void>;
  loading?: boolean;
  initialData?: MaterialItem | null;
  categoryTree: MaterialCategoryTreeItem[];
}

interface MaterialFormState {
  material_code: string;
  material_name: string;
  category: number | null;
  base_uom: number | null;
  image_url: string;
  description: string;
  is_active: boolean;
  metal_spec: MetalSpecFormValue;
}

const EMPTY: MaterialFormState = {
  material_code: "",
  material_name: "",
  category: null,
  base_uom: null,
  image_url: "",
  description: "",
  is_active: true,
  metal_spec: DEFAULT_METAL_SPEC,
};

const isMetalCode = (code: string) => code.includes("METAL") || code === "KL";

function toTree(nodes: MaterialCategoryTreeItem[]): TreeNode[] {
  return nodes.map((n) => ({ value: String(n.id), label: n.name, children: n.children?.length ? toTree(n.children) : undefined }));
}

/** Nhóm đang chọn hoặc một nhóm tổ tiên thuộc nhánh KIM LOẠI */
function isMetalCategory(nodes: MaterialCategoryTreeItem[], id: number | null, metalAncestor = false): boolean {
  if (id == null) return false;
  for (const n of nodes) {
    const metal = metalAncestor || isMetalCode(n.code);
    if (n.id === id) return metal;
    if (n.children?.length && isMetalCategory(n.children, id, metal)) return true;
  }
  return false;
}

function toFormState(material: MaterialItem): MaterialFormState {
  const spec = material.metal_spec;
  return {
    material_code: material.material_code,
    material_name: material.material_name,
    category: material.category_id,
    base_uom: material.base_uom_id,
    image_url: material.image_url || "",
    description: material.description || "",
    is_active: material.is_active,
    metal_spec: spec
      ? {
          profile_shape: spec.profile_shape,
          outer_dimension_1: spec.outer_dimension_1,
          outer_dimension_2: spec.outer_dimension_2,
          thickness: spec.thickness,
          standard_bar_length: spec.standard_bar_length,
          end_trim_loss: spec.end_trim_loss,
          saw_kerf_loss: spec.saw_kerf_loss,
          weight_per_meter_kg: spec.weight_per_meter_kg,
          mold_code: spec.mold_code || "",
          features: spec.features || "",
        }
      : DEFAULT_METAL_SPEC,
  };
}

function toPayload(values: MaterialFormState, includeMetalSpec: boolean): MaterialFormValues {
  const spec = values.metal_spec;
  return {
    material_code: values.material_code?.trim().toUpperCase() ?? "",
    material_name: values.material_name.trim(),
    category: values.category as number,
    base_uom: values.base_uom as number,
    image_url: values.image_url?.trim() || "",
    description: values.description?.trim() || "",
    is_active: values.is_active,
    metal_spec:
      includeMetalSpec && spec
        ? {
            profile_shape: spec.profile_shape,
            outer_dimension_1: spec.outer_dimension_1 ?? null,
            outer_dimension_2: spec.outer_dimension_2 ?? null,
            thickness: spec.thickness ?? null,
            standard_bar_length: spec.standard_bar_length ?? 6000,
            end_trim_loss: spec.end_trim_loss ?? 50,
            saw_kerf_loss: spec.saw_kerf_loss ?? 3,
            weight_per_meter_kg: spec.weight_per_meter_kg ?? null,
            mold_code: spec.mold_code?.trim() || "",
            features: spec.features?.trim() || "",
          }
        : null,
  };
}

export function MaterialFormModal({ open, onCancel, onSubmit, initialData, categoryTree }: MaterialFormModalProps) {
  const t = useTranslations("materials");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<MaterialFormState>({ defaultValues: EMPTY });
  const [autoName, setAutoName] = useState(!initialData);
  const tree = useMemo(() => toTree(categoryTree), [categoryTree]);
  const image = useController({ control: form.control, name: "image_url" });

  const categoryId = useWatch({ control: form.control, name: "category" });
  const metalSpec = useWatch({ control: form.control, name: "metal_spec" });
  const isMetal = useMemo(() => isMetalCategory(categoryTree, categoryId), [categoryTree, categoryId]);
  const generatedName = useMemo(() => buildMaterialName(metalSpec), [metalSpec]);

  // Mỗi lần mở: nạp dữ liệu vào form; tự sinh tên bật sẵn khi tạo mới
  const session = open ? (initialData ?? "new") : null;
  const [prevSession, setPrevSession] = useState(session);
  if (prevSession !== session) {
    setPrevSession(session);
    if (open) setAutoName(!initialData);
  }
  useEffect(() => {
    if (open) form.reset(initialData ? toFormState(initialData) : EMPTY);
  }, [open, initialData, form]);

  // Tự sinh tên NVL theo quy cách khi bật switch
  useEffect(() => {
    if (autoName && isMetal && generatedName) form.setValue("material_name", generatedName, { shouldDirty: true });
  }, [autoName, isMetal, generatedName, form]);

  // Mã hiển thị là mã gợi ý; mã chính thức do backend cấp khi lưu (chống trùng)
  useEffect(() => {
    if (!open || initialData || !categoryId) return;
    let cancelled = false;
    materialService
      .getNextCode(categoryId)
      .then((res) => !cancelled && res?.next_code && form.setValue("material_code", res.next_code))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, initialData, categoryId, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      title={initialData ? t("form.editTitle", { code: initialData.material_code }) : t("form.createTitle")}
      size="xl"
      form={form}
      submitText={initialData ? tc("actions.saveChanges") : t("form.createTitle")}
      onSubmit={(values) => onSubmit(toPayload(values, isMetal))}
    >
      <div className="grid gap-x-8 md:grid-cols-[11fr_13fr]">
        <FormSection title={t("form.generalSection")} columns={1}>
          <TreeSelectField<MaterialFormState> name="category" label={t("fields.category")} tree={tree} numeric placeholder={t("form.categoryPlaceholder")} rules={{ required: tv("requiredSelect", { field: t("fields.category") }) }} />
          <EntityComboField<MaterialFormState, Awaited<ReturnType<typeof unitService.list>>["results"][number]>
            name="base_uom"
            label={t("fields.baseUom")}
            placeholder={t("form.uomPlaceholder")}
            rules={{ required: tv("requiredSelect", { field: t("fields.baseUom") }) }}
            queryKey={["units", "select"]}
            fetchPage={(p) => unitService.list(p)}
            toOption={(u) => ({ value: String(u.id), label: u.name, code: u.code })}
            initialOptions={initialData ? [{ value: String(initialData.base_uom_id), label: initialData.base_uom_name, code: initialData.base_uom_code }] : []}
          />
          <TextField<MaterialFormState>
            name="material_name"
            label={t("fields.name")}
            placeholder={t("form.namePlaceholder")}
            rules={{ required: tv("required", { field: t("fields.name") }) }}
            // Người dùng tự gõ tên -> tắt tự sinh để không ghi đè
            transform={(v) => {
              if (autoName) setAutoName(false);
              return v;
            }}
            hint={
              isMetal ? (
                <span className="inline-flex items-center gap-2">
                  <Switch
                    size="sm"
                    checked={autoName}
                    aria-label={t("form.autoNameAria")}
                    onCheckedChange={(v) => {
                      setAutoName(v);
                      if (v && generatedName) form.setValue("material_name", generatedName, { shouldDirty: true });
                    }}
                  />
                  {t("form.autoName")}
                </span>
              ) : undefined
            }
          />
          <TextField<MaterialFormState>
            name="material_code"
            label={t("fields.code")}
            disabled
            placeholder={t("form.codePlaceholder")}
            inputClassName="font-mono font-semibold"
            hint={t("form.codeHint")}
          />
          <FieldShell id="f-image_url" label={t("fields.imageFull")}>
            <ImageUpload
              value={image.field.value}
              onChange={image.field.onChange}
              upload={async (file) => (await materialService.uploadImage(file)).image_url}
              hint={t("image.formats")}
              alt={t("image.alt")}
            />
          </FieldShell>
          <TextareaField<MaterialFormState> name="description" label={t("fields.technicalNote")} rows={2} placeholder={t("form.descriptionPlaceholder")} />
          <SwitchField<MaterialFormState> name="is_active" label={tc("fields.status")} onText={t("form.inUse")} offText={tc("status.inactive")} />
        </FormSection>
        <div className="max-md:mt-2 max-md:border-t max-md:pt-4">{isMetal ? <MetalSpecSection /> : <StandardSpecPlaceholder />}</div>
      </div>
    </FormDialog>
  );
}
