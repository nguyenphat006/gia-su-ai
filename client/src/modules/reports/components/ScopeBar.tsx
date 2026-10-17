"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { Combobox, type ComboOption } from "@/components/controls/Combobox";
import { DateRangePicker } from "@/components/controls/DateRangePicker";
import { useEntityOptions } from "@/components/controls/useEntityOptions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { http } from "@/lib/api/axiosClient";
import { gradeOptions } from "@/modules/academics/shared/grades";
import { schoolClassSource } from "@/modules/academics/shared/entitySources";
import type { Schemas } from "@/types/api";
import { useReportScope } from "../hooks/useReportScope";

const NO_OPTIONS: ComboOption[] = [];

/** Nhãn lớp đang chọn khi mở trang từ URL (danh sách lớp chỉ tải khi mở ô chọn) */
function useSelectedClassOption(id: string | null): ComboOption[] {
  const { data } = useQuery({
    queryKey: ["school-classes", "detail", Number(id)],
    queryFn: () => http.get<Schemas["SchoolClass"]>(`/classes/${id}/`),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
  return useMemo(() => (data ? [schoolClassSource.toOption(data)] : NO_OPTIONS), [data]);
}

/** Thanh phạm vi chung của /reports: khoảng ngày · khối · lớp (trên URL, áp dụng cho mọi tab) */
export function ScopeBar() {
  const t = useTranslations("reports");
  const ta = useTranslations("academics");
  const { scope, setScope, resetScope, hasCustomScope } = useReportScope();
  const selectedClass = useSelectedClassOption(scope.schoolClass);
  const classOptions = useEntityOptions({ ...schoolClassSource, initialOptions: selectedClass });
  const grades = useMemo(() => gradeOptions(ta), [ta]);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("scope.label")}>
      <DateRangePicker
        className="w-full sm:w-64"
        value={[scope.dateFrom, scope.dateTo]}
        onChange={(v) => setScope({ date_from: v?.[0] ?? null, date_to: v?.[1] ?? null })}
        placeholder={t("scope.defaultRange")}
      />
      <Combobox
        className="w-[calc(50%-4px)] sm:w-36"
        options={grades}
        value={scope.grade}
        onChange={(v) => setScope({ grade: v })}
        placeholder={t("scope.allGrades")}
        allowClear
      />
      <Combobox
        className="w-[calc(50%-4px)] sm:w-48"
        options={classOptions.options}
        value={scope.schoolClass}
        onChange={(v) => setScope({ school_class: v })}
        placeholder={t("scope.allClasses")}
        searchPlaceholder={t("scope.searchClass")}
        onSearch={classOptions.onSearch}
        onReachEnd={classOptions.onReachEnd}
        onOpenChange={classOptions.onOpenChange}
        loading={classOptions.loading}
        hasMore={classOptions.hasMore}
        allowClear
      />
      {hasCustomScope && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" onClick={resetScope} aria-label={t("scope.reset")}>
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("scope.reset")}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
