import { isScopeKey } from "./scope";
import type { ReportParams } from "./types";

export interface BuildListParamsOptions {
  /** Tên tham số tìm kiếm của API (mặc định `search`; hỏi đáp dùng `q`) */
  searchParam?: string;
  /**
   * true (trang /reports) = bỏ khóa phạm vi thô trên URL vì `base` đã mang phạm vi chuẩn hóa;
   * false (tab trang chi tiết) = khoảng ngày là bộ lọc cột của chính danh sách.
   */
  scoped?: boolean;
}

/** Tham số API cho danh sách báo cáo: bộ lọc của danh sách + `base` (phạm vi chung hoặc `user` cố định) */
export function buildListParams(
  listParams: Record<string, string | number>,
  base: Record<string, string | number | undefined>,
  { searchParam = "search", scoped = true }: BuildListParamsOptions = {},
): ReportParams {
  const out: ReportParams = {};
  for (const [key, value] of Object.entries(listParams)) {
    if (!scoped || !isScopeKey(key)) out[key] = value;
  }
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && value !== "") out[key] = value;
  }
  if (searchParam !== "search" && out.search !== undefined) {
    out[searchParam] = out.search;
    delete out.search;
  }
  return out;
}

/** Bộ lọc riêng của danh sách (trang /reports: không tính phạm vi chung) */
export function ownFilterKeys(filters: Record<string, string>, scoped = true): string[] {
  return Object.keys(filters).filter((key) => !scoped || !isScopeKey(key));
}
