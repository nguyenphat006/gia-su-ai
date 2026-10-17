"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Layers, ListChecks, LogIn, MessageCircle, Network, Swords, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Combobox } from "@/components/controls/Combobox";
import { RelativeTime } from "@/components/list";
import { Pagination } from "@/components/list/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentTimeline } from "../../hooks/useReportsQuery";
import { ARENA_MODE, EVENT_TYPES } from "../../statusMaps";
import type { LearningEventRow, LearningEventType } from "../../types";

const PAGE_SIZE = 20;

/** Icon + màu nền (token) theo loại hoạt động */
const EVENT_STYLE: Record<LearningEventType, { icon: LucideIcon; className: string }> = {
  LOGIN: { icon: LogIn, className: "bg-[var(--c-bg-muted)] text-muted-foreground" },
  CHAT: { icon: MessageCircle, className: "bg-[var(--c-primary-bg)] text-[var(--c-primary)]" },
  QUIZ: { icon: ListChecks, className: "bg-[var(--c-success-bg)] text-[var(--c-success)]" },
  FLASHCARD_VIEW: { icon: Layers, className: "bg-[var(--c-info-bg)] text-[var(--c-info)]" },
  MINDMAP_VIEW: { icon: Network, className: "bg-[var(--c-purple-bg)] text-[var(--c-purple)]" },
  ARENA: { icon: Swords, className: "bg-[var(--c-warning-bg)] text-[var(--c-warning)]" },
};

function EventItem({ event }: { event: LearningEventRow }) {
  const t = useTranslations("reports");
  const style = EVENT_STYLE[event.event_type];
  const Icon = style.icon;
  const meta = event.metadata ?? {};
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${style.className}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-foreground">{t(`timeline.events.${event.event_type}`)}</span>
          {event.event_type === "ARENA" && meta.mode && <StatusBadge map={ARENA_MODE} value={meta.mode} />}
          {event.event_type === "ARENA" && typeof meta.winner === "boolean" && (
            <StatusBadge tone={meta.winner ? "success" : "neutral"} label={meta.winner ? t("timeline.won") : t("timeline.lost")} />
          )}
        </div>
        {meta.topic && <p className="truncate text-sm text-muted-foreground">{meta.topic}</p>}
      </div>
      <span className="shrink-0 text-xs">
        <RelativeTime value={event.occurred_at} />
      </span>
    </li>
  );
}

/** Tab Hoạt động: dòng thời gian sự kiện học tập (mới nhất trước), lọc theo loại, phân trang server */
export function TimelineTab({ studentId }: { studentId: number }) {
  const t = useTranslations("reports");
  const tl = useTranslations("list");
  const tc = useTranslations("common");
  const [eventType, setEventType] = useState<string | null>(null);
  const [page, setPage] = useState({ page: 1, pageSize: PAGE_SIZE });
  const params = useMemo(
    () => ({ page: page.page, page_size: page.pageSize, ...(eventType ? { event_type: eventType } : {}) }),
    [page, eventType],
  );
  const { data, isLoading, isError, refetch, isFetching } = useStudentTimeline(studentId, params);
  const options = useMemo(() => EVENT_TYPES.map((type) => ({ value: type, label: t(`timeline.events.${type}`) })), [t]);

  const changeType = (value: string | null) => {
    setEventType(value);
    setPage((p) => ({ ...p, page: 1 }));
  };

  return (
    <div className="list-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <Combobox
          className="w-full sm:w-60"
          options={options}
          value={eventType}
          onChange={changeType}
          placeholder={t("timeline.allTypes")}
          aria-label={t("timeline.filterLabel")}
          allowClear
        />
      </div>
      <div className={isFetching && !isLoading ? "px-4 opacity-70 transition-opacity" : "px-4"}>
        {isLoading ? (
          <div className="space-y-3 py-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState title={t("timeline.loadError")} description={tl("page.loadErrorHint")} actionText={tc("actions.retry")} onAction={() => refetch()} actionType="default" icon={null} />
        ) : !data?.results.length ? (
          eventType ? (
            <EmptyState title={tl("page.noResults")} actionText={tc("actions.clear")} onAction={() => changeType(null)} actionType="default" icon={null} />
          ) : (
            <EmptyState title={t("timeline.empty")} />
          )
        ) : (
          <ol className="divide-y">
            {data.results.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </ol>
        )}
      </div>
      {data && data.count > 0 && <Pagination page={page.page} pageSize={page.pageSize} total={data.count} onChange={(p, size) => setPage({ page: size !== page.pageSize ? 1 : p, pageSize: size })} />}
    </div>
  );
}
