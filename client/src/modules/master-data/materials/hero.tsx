import React, { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { HeroConfig } from "@/components/detail";
import { ACTIVE_STATUS, StatusBadge } from "@/components/common/StatusBadge";
import { formatMaterialSpec } from "./utils";
import type { MaterialItem } from "./types";

/** Cấu hình Hero dùng chung cho trang chi tiết và ngăn xem nhanh (hook để dịch nhãn) */
export function useMaterialHero(): (m: MaterialItem) => HeroConfig {
  const t = useTranslations("materials");
  const tc = useTranslations("common");
  return useCallback(
    (m: MaterialItem): HeroConfig => ({
      title: m.material_name,
      image: m.image_url || null,
      badges: [<StatusBadge key="status" map={ACTIVE_STATUS} value={m.is_active} />],
      code: m.material_code,
      subtitle: [m.category_name, `${m.base_uom_name} (${m.base_uom_code})`],
      updatedAt: m.updated_at,
      updatedBy: m.updated_by_name,
      fields: [
        // Quy cách chỉ có ở NVL kim loại
        ...(m.metal_spec
          ? [
              { label: t("fields.spec"), value: formatMaterialSpec(m) },
              { label: t("specs.shape"), value: m.metal_spec.profile_shape_display ?? m.metal_spec.profile_shape },
              { label: t("specs.moldCode"), value: m.metal_spec.mold_code },
              { label: t("hero.weightPerMeter"), value: m.metal_spec.weight_per_meter_kg },
            ]
          : []),
        { label: tc("fields.createdBy"), value: m.created_by_name },
        { label: tc("fields.createdAt"), value: m.created_at },
        { label: tc("fields.description"), value: m.description, wide: true },
      ],
    }),
    [t, tc],
  );
}
