"use client";

import { useMemo, useState } from "react";
import type { ListState } from "@/components/list";

interface LocalState {
  search: string;
  page: number;
  pageSize: number;
  ordering: string | null;
  filters: Record<string, string>;
}

/**
 * Trạng thái danh sách giữ trong component (không ghi URL) — dùng cho danh sách nhúng trong tab của trang chi tiết,
 * nơi URL đã dành cho `?tab=`; cùng giao diện `ListState` để dùng lại FilterBar / ListTable.
 */
export function useLocalListState({ defaultPageSize = 10, defaultOrdering }: { defaultPageSize?: number; defaultOrdering?: string } = {}): ListState {
  const [state, setState] = useState<LocalState>({ search: "", page: 1, pageSize: defaultPageSize, ordering: null, filters: {} });

  const params = useMemo(() => {
    const out: Record<string, string | number> = { ...state.filters, page: state.page, page_size: state.pageSize };
    if (state.search) out.search = state.search;
    if (state.ordering || defaultOrdering) out.ordering = (state.ordering || defaultOrdering) as string;
    return out;
  }, [state, defaultOrdering]);

  return {
    ...state,
    params,
    hasFilters: Object.keys(state.filters).length > 0 || Boolean(state.search),
    setSearch: (value) => setState((s) => ({ ...s, search: value.trim(), page: 1 })),
    setPage: (page, pageSize) =>
      setState((s) => (pageSize && pageSize !== s.pageSize ? { ...s, page: 1, pageSize } : { ...s, page })),
    setOrdering: (value) => setState((s) => ({ ...s, ordering: value, page: 1 })),
    setFilters: (patch) =>
      setState((s) => {
        const filters = { ...s.filters };
        let search = s.search;
        for (const [key, value] of Object.entries(patch)) {
          // "q" = từ khóa (cùng quy ước với useListState trên URL)
          if (key === "q") search = value?.trim() ?? "";
          else if (value === null || value === undefined || value === "") delete filters[key];
          else filters[key] = value;
        }
        return { ...s, search, filters, page: 1 };
      }),
    clearFilters: () => setState((s) => ({ ...s, search: "", filters: {}, page: 1 })),
  };
}
