"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCssVars } from "@/hooks/useCssVars";
import type { DailyPoint } from "../../types";

type Metric = "active_students" | "events";
const METRICS: Metric[] = ["active_students", "events"];
const SERIES_KEY = { active_students: "activeStudents", events: "events" } as const;

const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

/**
 * Hoạt động theo ngày. Hai số đo khác thang (số học sinh vs số lượt) -> chọn một số đo mỗi lần (một trục),
 * không vẽ hai trục y.
 */
export function DailyChart({ data }: { data: DailyPoint[] }) {
  const t = useTranslations("reports");
  const [metric, setMetric] = useState<Metric>("active_students");
  const c = useCssVars(["--c-primary", "--c-border", "--c-text-secondary", "--c-surface", "--c-text"] as const);
  const label = t(`overview.series.${SERIES_KEY[metric]}`);

  return (
    <div className="space-y-3">
      <ToggleGroup type="single" size="sm" variant="outline" value={metric} onValueChange={(v) => v && setMetric(v as Metric)} aria-label={t("overview.panels.daily")}>
        {METRICS.map((m) => (
          <ToggleGroupItem key={m} value={m} className="px-3">
            {t(`overview.series.${SERIES_KEY[m]}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id="reportDailyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c["--c-primary"]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={c["--c-primary"]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c["--c-border"]} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 12, fill: c["--c-text-secondary"] }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: c["--c-text-secondary"] }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            labelFormatter={(v) => dayLabel(String(v))}
            formatter={(v) => [v, label]}
            cursor={{ stroke: c["--c-border"] }}
            contentStyle={{ background: c["--c-surface"], border: `1px solid ${c["--c-border"]}`, borderRadius: 8, fontSize: 13, color: c["--c-text"] }}
          />
          <Area type="monotone" dataKey={metric} name={label} stroke={c["--c-primary"]} strokeWidth={2} fill="url(#reportDailyFill)" activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
