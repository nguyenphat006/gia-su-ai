"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CircleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Khối nội dung phẳng của cổng học sinh (không lồng khối trong khối) */
export function Panel({
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border bg-card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
            {icon && <span className="shrink-0 text-[var(--c-primary)] [&_svg]:size-4">{icon}</span>}
            <span className="truncate">{title}</span>
          </h2>
          {action}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Lỗi tải dữ liệu + nút "Thử lại" */
export function ErrorBlock({ message, onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  const tc = useTranslations("common");
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-2 px-4 py-8 text-center", className)}>
      <CircleAlert className="size-8 text-[var(--c-error)]" strokeWidth={1.5} />
      <p className="max-w-sm text-sm text-muted-foreground">{message ?? tc("messages.loadError")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw />
          {tc("actions.retry")}
        </Button>
      )}
    </div>
  );
}

/** Danh sách dòng skeleton giữ chỗ */
export function RowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** Vòng tiến độ (SVG) — điểm số, tỉ lệ đúng */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  tone = "primary",
  children,
}: {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  tone?: "primary" | "success" | "warning" | "error";
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-bg-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`var(--c-${tone})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Ô số liệu nhỏ */
export function StatTile({ label, value, icon, tone = "primary" }: { label: string; value: React.ReactNode; icon?: React.ReactNode; tone?: "primary" | "success" | "warning" | "purple" | "info" | "error" }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-[var(--c-bg-subtle)] p-3">
      {icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4" style={{ background: `var(--c-${tone}-bg)`, color: `var(--c-${tone})` }}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-base font-semibold text-foreground tabular-nums">{value}</div>
      </div>
    </div>
  );
}
