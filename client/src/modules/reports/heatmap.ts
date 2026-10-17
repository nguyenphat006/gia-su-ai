import type { HeatmapCell } from "./types";

/** Thứ trong tuần theo ISO: 1 = Thứ Hai … 7 = Chủ nhật */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const HOURS = Array.from({ length: 24 }, (_, h) => h);
/** Số mức đậm nhạt (0 = không có hoạt động) */
export const HEAT_LEVELS = 5;

export interface HeatmapMatrix {
  /** matrix[weekday - 1][hour] = số hoạt động */
  matrix: number[][];
  max: number;
  total: number;
}

/** Dựng lưới 7 × 24 từ danh sách ô thưa của API; ô ngoài phạm vi bị bỏ qua, ô trùng được cộng dồn */
export function buildHeatmapMatrix(cells: readonly HeatmapCell[]): HeatmapMatrix {
  const matrix = WEEKDAYS.map(() => HOURS.map(() => 0));
  let max = 0;
  let total = 0;
  for (const { weekday, hour, count } of cells) {
    if (weekday < 1 || weekday > 7 || hour < 0 || hour > 23 || !(count > 0)) continue;
    const value = (matrix[weekday - 1][hour] += count);
    if (value > max) max = value;
    total += count;
  }
  return { matrix, max, total };
}

/** Mức đậm 0..HEAT_LEVELS-1 (0 chỉ khi count = 0; có hoạt động luôn >= 1) */
export function heatLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.max(1, Math.ceil((count / max) * (HEAT_LEVELS - 1)));
}

/** Tỉ lệ pha màu chính (%) theo mức — dùng với color-mix trên token màu */
export function heatMixPercent(level: number): number {
  return level <= 0 ? 0 : Math.round((level / (HEAT_LEVELS - 1)) * 85) + 10;
}
