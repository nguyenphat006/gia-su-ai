"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { MaterialItem, ProfileShape } from "../types";
import { useNumberFormat } from "@/providers/NumberFormatProvider";

export interface MaterialDetailSpecsTabProps {
  material: MaterialItem;
}

/** Sơ đồ mặt cắt minh họa (SVG, nền tối cố định như bản vẽ CAD) */
function ProfileCrossSectionSvg({ shape, d1, d2, t, ariaLabel }: { shape?: ProfileShape | string; d1?: number | null; d2?: number | null; t?: number | null; ariaLabel: string }) {
  const outer1 = Number(d1) || 40;
  const outer2 = Number(d2) || 40;
  const thick = Number(t) || 2;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-[#0F172A] p-4">
      <svg width="220" height="150" viewBox="0 0 220 150" role="img" aria-label={ariaLabel}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="220" height="150" fill="url(#grid)" />
        <line x1="110" y1="15" x2="110" y2="135" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />
        <line x1="20" y1="75" x2="200" y2="75" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />

        {shape === "ROUND_PIPE" ? (
          <g>
            <circle cx="110" cy="75" r="48" fill="#1E40AF" fillOpacity="0.15" stroke="#38BDF8" strokeWidth="2.5" />
            <circle cx="110" cy="75" r="34" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4,2" />
            <text x="110" y="78" fill="#F8FAFC" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              Ø{outer1}
            </text>
            <text x="110" y="142" fill="#38BDF8" fontSize="10" textAnchor="middle" fontFamily="monospace">
              t = {thick} mm
            </text>
          </g>
        ) : shape === "SOLID_ROUND" ? (
          <g>
            <circle cx="110" cy="75" r="46" fill="#1E40AF" fillOpacity="0.4" stroke="#38BDF8" strokeWidth="2.5" />
            <text x="110" y="78" fill="#F8FAFC" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              Ø{outer1}
            </text>
          </g>
        ) : shape === "SQUARE_TUBE" ? (
          <g>
            <rect x="65" y="30" width="90" height="90" rx="4" fill="#1E40AF" fillOpacity="0.2" stroke="#38BDF8" strokeWidth="2.5" />
            <rect x="77" y="42" width="66" height="66" rx="2" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.8" strokeDasharray="4,2" />
            <text x="110" y="79" fill="#F8FAFC" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              {outer1}×{outer1}
            </text>
            <text x="110" y="140" fill="#38BDF8" fontSize="10" textAnchor="middle" fontFamily="monospace">
              t = {thick} mm
            </text>
          </g>
        ) : shape === "FLAT_BAR" ? (
          <g>
            <rect x="50" y="55" width="120" height="40" rx="3" fill="#1E40AF" fillOpacity="0.4" stroke="#38BDF8" strokeWidth="2.5" />
            <text x="110" y="79" fill="#F8FAFC" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              {thick}×{outer1} mm
            </text>
          </g>
        ) : (
          <g>
            <rect x="45" y="35" width="130" height="80" rx="4" fill="#1E40AF" fillOpacity="0.2" stroke="#38BDF8" strokeWidth="2.5" />
            <rect x="57" y="47" width="106" height="56" rx="2" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.8" strokeDasharray="4,2" />
            <text x="110" y="79" fill="#F8FAFC" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
              {outer1}×{outer2} mm
            </text>
            <text x="110" y="140" fill="#38BDF8" fontSize="10" textAnchor="middle" fontFamily="monospace">
              t = {thick} mm
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function SpecItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children ?? "—"}</dd>
    </div>
  );
}

/** Tab "Quy cách & bản vẽ" — chỉ có ở NVL kim loại */
export function MaterialDetailSpecsTab({ material }: MaterialDetailSpecsTabProps) {
  const t = useTranslations("materials.specs");
  const { formatDimension, formatWeight, formatNumber } = useNumberFormat();
  const spec = material.metal_spec;
  if (!spec) return null;

  const size =
    spec.profile_shape === "ROUND_PIPE" || spec.profile_shape === "SOLID_ROUND"
      ? `Ø${formatDimension(spec.outer_dimension_1)}`
      : spec.profile_shape === "SQUARE_TUBE" || spec.profile_shape === "SOLID_SQUARE"
        ? `${formatNumber(spec.outer_dimension_1)}×${formatNumber(spec.outer_dimension_1)} mm`
        : spec.profile_shape === "FLAT_BAR"
          ? `${formatNumber(spec.thickness)}×${formatNumber(spec.outer_dimension_1)} mm`
          : `${formatNumber(spec.outer_dimension_1)}×${formatNumber(spec.outer_dimension_2)} mm`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <SpecItem label={t("shape")}>{spec.profile_shape_display || spec.profile_shape}</SpecItem>
        <SpecItem label={t("sectionSize")}>{size}</SpecItem>
        <SpecItem label={t("thickness")}>{spec.thickness ? formatDimension(spec.thickness) : t("solid")}</SpecItem>
        <SpecItem label={t("barLengthL")}>
          {formatDimension(spec.standard_bar_length)} ({formatNumber(spec.standard_bar_length / 1000, 2)} m)
        </SpecItem>
        <SpecItem label={t("actualWeight")}>
          {spec.weight_per_meter_kg ? (
            <>
              {formatWeight(spec.weight_per_meter_kg, "kg/m")}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ~{formatWeight(spec.weight_per_meter_kg * (spec.standard_bar_length / 1000), t("kgPerBar"))}
              </span>
            </>
          ) : null}
        </SpecItem>
        <SpecItem label={t("usableLength")}>{formatDimension(spec.standard_bar_length - spec.end_trim_loss)}</SpecItem>
        <SpecItem label={t("endTrimLoss")}>{t("perBar", { value: formatDimension(spec.end_trim_loss) })}</SpecItem>
        <SpecItem label={t("sawKerfLoss")}>{t("perCut", { value: formatDimension(spec.saw_kerf_loss) })}</SpecItem>
        <SpecItem label={t("moldCode")}>{spec.mold_code ? <span className="font-mono">{spec.mold_code}</span> : null}</SpecItem>
        <SpecItem label={t("features")}>{spec.features || null}</SpecItem>
        {spec.description && (
          <div className="sm:col-span-2">
            <SpecItem label={t("note")}>{spec.description}</SpecItem>
          </div>
        )}
      </dl>
      <ProfileCrossSectionSvg shape={spec.profile_shape} d1={spec.outer_dimension_1} d2={spec.outer_dimension_2} t={spec.thickness} ariaLabel={t("diagram")} />
    </div>
  );
}
