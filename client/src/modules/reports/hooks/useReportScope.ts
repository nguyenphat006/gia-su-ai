"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseScope, scopeToParams, SCOPE_KEYS, type ScopeKey } from "../scope";

/**
 * Phạm vi chung của trang /reports (khoảng ngày, khối, lớp) trên URL.
 * Đổi phạm vi giữ tab đang mở và bộ lọc riêng của tab, chỉ về trang 1.
 */
export function useReportScope() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  const scope = useMemo(() => parseScope(new URLSearchParams(query)), [query]);
  const params = useMemo(() => scopeToParams(scope), [scope]);

  const setScope = (patch: Partial<Record<ScopeKey, string | null>>) => {
    const sp = new URLSearchParams(query);
    for (const [key, value] of Object.entries(patch)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.delete("page");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const resetScope = () => setScope(Object.fromEntries(SCOPE_KEYS.map((k) => [k, null])));
  const hasCustomScope = !scope.isDefaultRange || Boolean(scope.grade || scope.schoolClass);

  return { scope, params, setScope, resetScope, hasCustomScope };
}
