"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildHeatmapMatrix, HEAT_LEVELS, heatLevel, heatMixPercent, HOURS, WEEKDAYS } from "../../heatmap";
import type { HeatmapCell } from "../../types";

/** Nền ô theo mức: pha màu chính với nền mờ (token, đúng cả sáng / tối) */
const cellBackground = (level: number) =>
  level === 0 ? "var(--c-bg-muted)" : `color-mix(in srgb, var(--c-primary) ${heatMixPercent(level)}%, var(--c-surface))`;

const LEGEND_LEVELS = Array.from({ length: HEAT_LEVELS }, (_, i) => i);
/** Nhãn giờ thưa để không chồng chữ ở màn hẹp */
const HOUR_LABELS = new Set([0, 6, 12, 18, 23]);

/** Giờ học trong tuần: lưới thứ × giờ (CSS grid), đậm nhạt theo số hoạt động, tooltip số lượng */
export function StudyHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const t = useTranslations("reports");
  const { matrix, max } = useMemo(() => buildHeatmapMatrix(cells), [cells]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="grid min-w-[520px] grid-cols-[40px_repeat(24,minmax(14px,1fr))] gap-[2px]" role="group" aria-label={t("overview.panels.heatmap")}>
          {WEEKDAYS.map((day) => (
            <React.Fragment key={day}>
              <span className="pr-2 text-right text-xs leading-5 text-muted-foreground">
                {t(`heatmap.weekdays.${day}`)}
              </span>
              {HOURS.map((hour) => {
                const count = matrix[day - 1][hour];
                const text = t("heatmap.cell", { day: t(`heatmap.weekdays.${day}`), hour, count });
                return (
                  <Tooltip key={hour}>
                    <TooltipTrigger asChild>
                      <span
                        role="img"
                        aria-label={text}
                        className="h-5 rounded-[3px]"
                        style={{ background: cellBackground(heatLevel(count, max)) }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{text}</TooltipContent>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          ))}
          <span aria-hidden />
          {HOURS.map((hour) => (
            <span key={hour} aria-hidden className="text-center text-[11px] leading-4 text-muted-foreground tabular-nums">
              {HOUR_LABELS.has(hour) ? hour : ""}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground" aria-label={t("heatmap.legend")}>
        <span>{t("heatmap.less")}</span>
        {LEGEND_LEVELS.map((level) => (
          <span key={level} aria-hidden className="size-3 rounded-[3px]" style={{ background: cellBackground(level) }} />
        ))}
        <span>{t("heatmap.more")}</span>
      </div>
    </div>
  );
}
