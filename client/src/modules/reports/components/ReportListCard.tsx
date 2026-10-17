"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import type { ListColumn, ListQuery, ListState } from "@/components/list";
import { resolveColumns } from "@/components/list/columnLayout";
import { FilterBar } from "@/components/list/FilterBar";
import { ListTable } from "@/components/list/ListTable";
import { TableSettings } from "@/components/list/TableSettings";
import { useListPreferences } from "@/components/list/useListPreferences";
import { cn } from "@/lib/utils";
import { ownFilterKeys } from "../listParams";

export interface ReportListCardProps<T> {
  tableKey: string;
  list: ListState;
  query: ListQuery<T>;
  columns: ListColumn<T>[];
  /** Tên thực thể viết thường (trạng thái rỗng) */
  entityLabel: string;
  searchPlaceholder?: string;
  /** false = danh sách nhúng (tab trang chi tiết): khoảng ngày là bộ lọc của chính danh sách */
  scoped?: boolean;
  /** false = API không hỗ trợ tìm kiếm -> ẩn ô tìm */
  searchable?: boolean;
  onExport?: () => void;
  /** Dòng chú thích nhỏ dưới bảng */
  footnote?: React.ReactNode;
  /** Drawer / modal của danh sách */
  children?: React.ReactNode;
}

/**
 * Khối danh sách chỉ đọc của Báo cáo học tập: thanh công cụ (tìm · Bộ lọc · ⟳ · Xuất · ⚙) + bảng + phân trang.
 * Không kèm PageHeader để dùng được cả trong tab của /reports lẫn tab của trang chi tiết học sinh.
 * Phạm vi chung (ngày, khối, lớp) không tính là "bộ lọc" — Xóa lọc giữ nguyên phạm vi.
 */
export function ReportListCard<T extends object>({
  tableKey,
  list,
  query,
  columns,
  entityLabel,
  searchPlaceholder,
  scoped = true,
  searchable = true,
  onExport,
  footnote,
  children,
}: ReportListCardProps<T>) {
  const t = useTranslations("list");
  const tc = useTranslations("common");
  const prefsApi = useListPreferences(tableKey);
  const resolved = useMemo(() => resolveColumns(columns, prefsApi.prefs), [columns, prefsApi.prefs]);

  const ownKeys = ownFilterKeys(list.filters, scoped);
  const hasOwnFilters = ownKeys.length > 0 || Boolean(list.search);
  // `q` = từ khóa tìm kiếm; giữ nguyên phạm vi chung
  const clear = () => list.setFilters({ q: null, ...Object.fromEntries(ownKeys.map((k) => [k, null])) });

  const empty = query.isError ? (
    <EmptyState title={tc("messages.loadError")} description={t("page.loadErrorHint")} actionText={tc("actions.retry")} onAction={() => query.refetch()} actionType="default" icon={null} />
  ) : hasOwnFilters ? (
    <EmptyState title={t("page.noResults")} description={t("page.noResultsHint")} actionText={tc("actions.clear")} onAction={clear} actionType="default" icon={null} />
  ) : (
    <EmptyState title={t("page.empty", { entity: entityLabel })} />
  );

  return (
    <>
      <div className={cn("list-card", !searchable && "[&_.filter-bar__search]:hidden")}>
        <FilterBar
          list={list}
          columns={columns}
          searchPlaceholder={searchPlaceholder ?? t("page.searchPlaceholder")}
          onRefresh={() => query.refetch()}
          refreshing={query.isFetching && !query.isLoading}
          onExport={onExport}
          settings={<TableSettings resolved={resolved} prefsApi={prefsApi} />}
        />
        <ListTable<T>
          resolved={resolved}
          prefsApi={prefsApi}
          list={list}
          data={query.data?.results}
          total={query.data?.count ?? 0}
          loading={query.isLoading}
          fetching={query.isFetching}
          rowKey="id"
          empty={empty}
        />
      </div>
      {footnote && <p className="mt-2 text-xs text-muted-foreground">{footnote}</p>}
      {children}
    </>
  );
}
