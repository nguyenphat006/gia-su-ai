import type { ReportScopeParams } from "./types";

/**
 * Phạm vi lọc chung của Báo cáo học tập, lưu trên URL: `date_from`, `date_to` (YYYY-MM-DD), `grade` (6–9), `school_class` (id).
 * Không có ngày trên URL -> 30 ngày gần nhất (khớp mặc định backend) và luôn gửi ngày tường minh lên API
 * để mọi tab (kể cả danh sách học sinh) đếm trên cùng một khoảng.
 */
export const SCOPE_KEYS = ["date_from", "date_to", "grade", "school_class"] as const;
export type ScopeKey = (typeof SCOPE_KEYS)[number];

export const DEFAULT_DAYS = 30;
const VALID_GRADES = new Set(["6", "7", "8", "9"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ReportScope {
  dateFrom: string;
  dateTo: string;
  grade: string | null;
  schoolClass: string | null;
  /** true = không chọn ngày, đang dùng 30 ngày gần nhất */
  isDefaultRange: boolean;
}

interface ParamReader {
  get(name: string): string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function validDate(value: string | null): string | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) || isoDate(d) !== value ? null : value;
}

/** 30 ngày gần nhất tính cả hôm nay */
export function defaultRange(today: Date = new Date()): [string, string] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DEFAULT_DAYS - 1));
  return [isoDate(start), isoDate(today)];
}

export function isScopeKey(key: string): key is ScopeKey {
  return (SCOPE_KEYS as readonly string[]).includes(key);
}

/** Đọc phạm vi từ URL; giá trị sai định dạng bị bỏ qua, ngày đảo ngược tự đổi chỗ */
export function parseScope(params: ParamReader, today: Date = new Date()): ReportScope {
  let from = validDate(params.get("date_from"));
  let to = validDate(params.get("date_to"));
  const todayIso = isoDate(today);
  const isDefaultRange = !from && !to;
  // Chỉ có "từ" -> đến hôm nay; chỉ có "đến" -> 30 ngày tính ngược từ ngày đó
  if (!to) to = from && from > todayIso ? from : todayIso;
  if (!from) from = defaultRange(new Date(`${to}T00:00:00`))[0];
  if (from > to) [from, to] = [to, from];
  const grade = params.get("grade");
  const schoolClass = params.get("school_class");
  return {
    dateFrom: from,
    dateTo: to,
    grade: grade && VALID_GRADES.has(grade) ? grade : null,
    schoolClass: schoolClass && /^\d+$/.test(schoolClass) ? schoolClass : null,
    isDefaultRange,
  };
}

/** Tham số gửi API */
export function scopeToParams(scope: ReportScope): ReportScopeParams {
  const params: ReportScopeParams = { date_from: scope.dateFrom, date_to: scope.dateTo };
  if (scope.grade) params.grade = scope.grade;
  if (scope.schoolClass) params.school_class = scope.schoolClass;
  return params;
}

/**
 * URL khi đổi tab của trang /reports: giữ phạm vi chung, bỏ tìm kiếm / bộ lọc / trang / sắp xếp của tab cũ.
 * Tab mặc định không ghi `tab` lên URL.
 */
export function tabHref(pathname: string, search: string, tab: string, defaultTab: string): string {
  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  for (const key of SCOPE_KEYS) {
    const value = current.get(key);
    if (value) next.set(key, value);
  }
  if (tab !== defaultTab) next.set("tab", tab);
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
