import type { MaterialItem } from "./types";

/** Quy cách ngắn gọn: Ø25 × 6000mm hoặc 40×20 × 6000mm */
export function formatMaterialSpec(material: MaterialItem): string | null {
  const spec = material.metal_spec;
  if (!spec) return null;
  const n = (v: number | string | null | undefined) => (v === null || v === undefined ? "?" : String(Number(v)));
  const round = spec.profile_shape === "ROUND_PIPE" || spec.profile_shape === "SOLID_ROUND";
  const section = round ? `Ø${n(spec.outer_dimension_1)}` : `${n(spec.outer_dimension_1)}×${n(spec.outer_dimension_2 || spec.outer_dimension_1)}`;
  return `${section} × ${n(spec.standard_bar_length)}mm`;
}
