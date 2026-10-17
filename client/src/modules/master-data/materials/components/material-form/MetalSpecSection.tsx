"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useFormContext, useWatch } from "react-hook-form";
import { Info, TriangleAlert } from "lucide-react";
import { FormSection, NumberField, SelectField, TextField } from "@/components/form";
import { cn } from "@/lib/utils";
import type { ProfileShape } from "../../types";
import { calcProfilePhysics, PROFILE_SHAPE_OPTIONS, type MetalSpecFormValue } from "./metalSpecUtils";

const SHAPES_WITH_SECOND_DIMENSION: ProfileShape[] = ["RECT_TUBE", "OVAL_PIPE", "SHEET", "SPECIAL_MOLD"];
const SOLID_SHAPES: ProfileShape[] = ["SOLID_ROUND", "SOLID_SQUARE"];

/** Khóa nhãn kích thước thứ nhất theo dạng tiết diện */
function firstDimensionKey(shape?: ProfileShape): "outerDiameter" | "squareSide" | "flatWidth" | "shortSide" {
  if (shape === "ROUND_PIPE" || shape === "SOLID_ROUND") return "outerDiameter";
  if (shape === "SQUARE_TUBE" || shape === "SOLID_SQUARE") return "squareSide";
  if (shape === "FLAT_BAR") return "flatWidth";
  return "shortSide";
}

type SpecForm = { metal_spec: MetalSpecFormValue };

/** Khối "Quy cách phôi kim loại" (Sổ tay Profile) — dùng form cha qua useFormContext */
export function MetalSpecSection() {
  const t = useTranslations("materials.specs");
  const tv = useTranslations("validation");
  const tr = useTranslations();
  const shapeOptions = useMemo(
    () => PROFILE_SHAPE_OPTIONS.map((o) => ({ value: o.value, label: o.formula ? `${tr(o.label)} — ${o.formula}` : tr(o.label) })),
    [tr],
  );
  const { control } = useFormContext<SpecForm>();
  const spec = useWatch({ control, name: "metal_spec" });
  const shape = spec?.profile_shape;
  const physics = useMemo(() => calcProfilePhysics(spec), [spec]);
  const hasSecond = !!shape && SHAPES_WITH_SECOND_DIMENSION.includes(shape);
  const isSolid = !!shape && SOLID_SHAPES.includes(shape);

  return (
    <FormSection title={t("section")} description={t("sectionHint")}>
      <SelectField<SpecForm> name="metal_spec.profile_shape" label={t("shape")} options={shapeOptions} rules={{ required: tv("requiredSelect", { field: t("shape") }) }} className="form-section__full" />
      <NumberField<SpecForm> name="metal_spec.outer_dimension_1" label={t(firstDimensionKey(shape))} suffix="mm" min={0} placeholder="20" rules={{ required: tv("required", { field: t(firstDimensionKey(shape)) }) }} />
      {hasSecond && <NumberField<SpecForm> name="metal_spec.outer_dimension_2" label={t("longSide")} suffix="mm" min={0} placeholder="30" rules={{ required: tv("required", { field: t("longSide") }) }} />}
      {!isSolid && <NumberField<SpecForm> name="metal_spec.thickness" label={t("thickness")} suffix="mm" min={0} placeholder="1.2" rules={{ required: tv("required", { field: t("thickness") }) }} />}
      <NumberField<SpecForm> name="metal_spec.standard_bar_length" label={t("barLength")} suffix="mm" min={100} placeholder="6000" rules={{ required: tv("required", { field: t("barLength") }) }} />
      <NumberField<SpecForm> name="metal_spec.weight_per_meter_kg" label={t("actualWeight")} suffix="kg/m" min={0} placeholder="0.3080" hint={t("actualWeightHint")} />
      <TextField<SpecForm> name="metal_spec.mold_code" label={t("moldCode")} placeholder={t("moldCodePlaceholder")} />
      <TextField<SpecForm> name="metal_spec.features" label={t("features")} placeholder={t("featuresPlaceholder")} />
      <NumberField<SpecForm> name="metal_spec.end_trim_loss" label={t("endTrimLoss")} suffix="mm" min={0} />
      <NumberField<SpecForm> name="metal_spec.saw_kerf_loss" label={t("sawKerfLoss")} suffix="mm" min={0} />

      {physics.theoreticalKgM && (
        <div className={cn("form-section__full space-y-1 rounded-md border bg-[var(--c-bg-subtle)] p-3 text-xs", physics.isWarning && "border-[var(--c-warning)]")}>
          <PhysicsRow label={t("area")} value={`${physics.areaMm2} mm²`} />
          <PhysicsRow label={t("theoreticalWeight")} value={`${physics.theoreticalKgM} kg/m`} />
          {physics.weightPerBarKg && <PhysicsRow label={t("barWeight")} value={`${physics.weightPerBarKg} ${t("kgPerBar")}`} />}
          {physics.isWarning && (
            <p className="flex items-start gap-1.5 pt-1 text-[var(--c-warning)]">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              {t("deviationWarning", { percent: physics.diffPercent ?? 0 })}
            </p>
          )}
        </div>
      )}
    </FormSection>
  );
}

function PhysicsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <strong className="font-semibold tabular-nums">{value}</strong>
    </div>
  );
}

/** Nhóm NVL không thuộc nhánh kim loại: quy cách theo ĐVT + mô tả */
export function StandardSpecPlaceholder() {
  const t = useTranslations("materials.specs");
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
      <Info className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">{t("standardTitle")}</p>
      <p className="max-w-[300px] text-xs text-muted-foreground">{t("standardHint")}</p>
    </div>
  );
}
