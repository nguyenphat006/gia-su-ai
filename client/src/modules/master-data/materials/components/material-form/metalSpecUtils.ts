import type { MessageKey } from "@/i18n/types";
import type { ProfileShape } from "../../types";

/** Giá trị form của quy cách phôi kim loại (các trường đều có thể đang trống khi người dùng nhập dở) */
export interface MetalSpecFormValue {
  profile_shape?: ProfileShape;
  outer_dimension_1?: number | null;
  outer_dimension_2?: number | null;
  thickness?: number | null;
  standard_bar_length?: number | null;
  weight_per_meter_kg?: number | null;
  end_trim_loss?: number | null;
  saw_kerf_loss?: number | null;
  mold_code?: string;
  features?: string;
}

export const DEFAULT_METAL_SPEC: MetalSpecFormValue = {
  profile_shape: "RECT_TUBE",
  standard_bar_length: 6000,
  end_trim_loss: 50,
  saw_kerf_loss: 3,
};

/**
 * Dạng tiết diện: `label` là khóa chữ (dịch lúc render bằng `useTranslations()`), `formula` là ký hiệu quy cách
 * theo Sổ tay Profile (không dịch).
 */
export const PROFILE_SHAPE_OPTIONS: { value: ProfileShape; label: MessageKey; formula?: string }[] = [
  { value: "ROUND_PIPE", label: "materials.shapes.ROUND_PIPE", formula: "Ø*t*L" },
  { value: "RECT_TUBE", label: "materials.shapes.RECT_TUBE", formula: "a*b*t*L" },
  { value: "SQUARE_TUBE", label: "materials.shapes.SQUARE_TUBE", formula: "a*t*L" },
  { value: "FLAT_BAR", label: "materials.shapes.FLAT_BAR", formula: "t*w*L" },
  { value: "SOLID_ROUND", label: "materials.shapes.SOLID_ROUND", formula: "Ø*L" },
  { value: "SOLID_SQUARE", label: "materials.shapes.SOLID_SQUARE", formula: "a*L" },
  { value: "OVAL_PIPE", label: "materials.shapes.OVAL_PIPE", formula: "a*b*t*L" },
  { value: "SHEET", label: "materials.shapes.SHEET", formula: "W*L*t" },
  { value: "ANGLE_V", label: "materials.shapes.ANGLE_V" },
  { value: "SPECIAL_MOLD", label: "materials.shapes.SPECIAL_MOLD" },
];

/** Khối lượng riêng nhôm: 2.72 g/cm³ -> kg/m trên mỗi mm² tiết diện */
const ALUMINIUM_KG_PER_M_PER_MM2 = 0.00272;
/** Ngưỡng lệch (%) giữa định lượng thực tế và lý thuyết để cảnh báo gõ nhầm / khuôn có gân */
const WEIGHT_DEVIATION_WARNING_PERCENT = 8;

/**
 * Tên NVL chuẩn theo quy cách phôi (xem .claude/rules/manufacturing-domain.md).
 * Trả chuỗi rỗng khi chưa chọn hình dạng mặt cắt.
 */
export function buildMaterialName(spec?: MetalSpecFormValue): string {
  if (!spec?.profile_shape) return "";
  const { profile_shape, outer_dimension_1: d1, outer_dimension_2: d2, thickness: t, standard_bar_length: barLen } = spec;
  const lenStr = barLen ? ` cây ${(Number(barLen) / 1000).toFixed(Number(barLen) % 1000 === 0 ? 0 : 1)}m` : "";
  const featStr = spec.features ? ` ${String(spec.features).trim()}` : "";
  const moldStr = spec.mold_code ? ` [Khuôn ${String(spec.mold_code).trim()}]` : "";
  const tail = `${lenStr}${featStr}${moldStr}`;

  switch (profile_shape) {
    case "ROUND_PIPE":
      return `Ống nhôm tròn Phi ${d1 || "?"} dày ${t || "?"}${tail}`.trim();
    case "RECT_TUBE":
      return `Nhôm hộp chữ nhật ${d1 || "?"}x${d2 || "?"} dày ${t || "?"}${tail}`.trim();
    case "SQUARE_TUBE":
      return `Hộp nhôm vuông ${d1 || "?"}x${d1 || "?"} dày ${t || "?"}${tail}`.trim();
    case "FLAT_BAR":
      return `Thanh la nhôm phẳng ${t || "?"}x${d1 || "?"}${tail}`.trim();
    case "SOLID_ROUND":
      return `Cây nhôm tròn đặc Phi ${d1 || "?"}${tail}`.trim();
    case "SOLID_SQUARE":
      return `Cây nhôm vuông đặc ${d1 || "?"}x${d1 || "?"}${tail}`.trim();
    case "OVAL_PIPE":
      return `Ống nhôm Oval ${d1 || "?"}x${d2 || "?"} dày ${t || "?"}${tail}`.trim();
    case "ANGLE_V":
      return `Thanh nhôm V ${d1 || "?"}x${d2 || d1 || "?"} dày ${t || "?"}${tail}`.trim();
    case "SPECIAL_MOLD":
      return `Nhôm định hình khuôn ${spec.mold_code || "SP"}${t ? ` dày ${t}` : ""}${lenStr}${featStr}`.trim();
    default:
      return "";
  }
}

/** Diện tích mặt cắt (mm²) theo Sổ tay Profile nhôm; 0 nếu thiếu kích thước hoặc hình dạng không hỗ trợ */
function crossSectionArea(shape: ProfileShape, d1: number, d2: number, t: number): number {
  switch (shape) {
    case "ROUND_PIPE":
      return d1 > 0 && t > 0 ? Math.PI * t * (d1 - t) : 0;
    case "SOLID_ROUND":
      return d1 > 0 ? (Math.PI / 4) * d1 * d1 : 0;
    case "SQUARE_TUBE":
      return d1 > 0 && t > 0 ? 4 * t * (d1 - t) : 0;
    case "SOLID_SQUARE":
      return d1 > 0 ? d1 * d1 : 0;
    case "RECT_TUBE":
      return d1 > 0 && d2 > 0 && t > 0 ? 2 * t * (d1 + d2 - 2 * t) : 0;
    case "OVAL_PIPE":
      return d1 > 0 && d2 > 0 && t > 0 ? Math.PI * t * ((d1 + d2) / 2 - t) : 0;
    case "FLAT_BAR":
      return d1 > 0 && t > 0 ? d1 * t : 0;
    default:
      return 0;
  }
}

export interface ProfilePhysics {
  areaMm2: number | null;
  theoreticalKgM: number | null;
  weightPerBarKg: number | null;
  diffPercent: number | null;
  isWarning: boolean;
}

/** Định lượng lý thuyết, trọng lượng cây và cảnh báo lệch so với định lượng thực tế */
export function calcProfilePhysics(spec?: MetalSpecFormValue): ProfilePhysics {
  const shape = spec?.profile_shape || "RECT_TUBE";
  const area = crossSectionArea(
    shape,
    Number(spec?.outer_dimension_1) || 0,
    Number(spec?.outer_dimension_2) || 0,
    Number(spec?.thickness) || 0,
  );
  const barLengthM = (Number(spec?.standard_bar_length) || 6000) / 1000;
  const actual = Number(spec?.weight_per_meter_kg) || 0;

  const theoreticalKgM = area > 0 ? Number((area * ALUMINIUM_KG_PER_M_PER_MM2).toFixed(4)) : null;
  const perMeter = actual > 0 ? actual : theoreticalKgM;
  const weightPerBarKg = perMeter ? Number((perMeter * barLengthM).toFixed(2)) : null;

  let diffPercent: number | null = null;
  if (actual > 0 && theoreticalKgM) {
    diffPercent = Number((((actual - theoreticalKgM) / theoreticalKgM) * 100).toFixed(1));
  }

  return {
    areaMm2: area > 0 ? Number(area.toFixed(1)) : null,
    theoreticalKgM,
    weightPerBarKg,
    diffPercent,
    isWarning: diffPercent !== null && Math.abs(diffPercent) > WEIGHT_DEVIATION_WARNING_PERCENT,
  };
}
