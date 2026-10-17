"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { defineColumns } from "@/components/list";
import { useChatLogs } from "../../hooks/useReportsQuery";
import { buildListParams } from "../../listParams";
import { BLOCKED_STATUS } from "../../statusMaps";
import type { ChatLogRow } from "../../types";
import { ReportListCard } from "../ReportListCard";
import { ChatLogDrawer } from "./ChatLogDrawer";
import { studentColumns, timeColumn, type ReportListProps } from "./columns";

/** Nhật ký hỏi đáp gia sư AI: tìm theo từ khóa trong câu hỏi, lọc bị chặn; bấm câu hỏi -> ngăn xem đầy đủ */
export function ChatLogList({ list, base, embedded }: ReportListProps) {
  const t = useTranslations("reports");
  const tr = useTranslations();
  const [detailId, setDetailId] = useState<number | null>(null);
  const params = useMemo(() => buildListParams(list.params, base, { searchParam: "q", scoped: !embedded }), [list.params, base, embedded]);
  const query = useChatLogs(params);

  const columns = useMemo(
    () =>
      defineColumns<ChatLogRow>([
        {
          key: "question",
          title: t("fields.question"),
          width: 320,
          pinned: "left",
          hideable: false,
          render: (v: string, r) => (
            <button type="button" title={v} className="block max-w-full truncate text-left font-medium text-primary hover:underline" onClick={() => setDetailId(r.id)}>
              {v}
            </button>
          ),
        },
        {
          key: "answer",
          title: t("fields.answer"),
          width: 300,
          ellipsis: true,
          render: (v: string | null) => (v ? <span className="list-muted">{v}</span> : <span className="list-empty-value">{t("chat.noAnswer")}</span>),
        },
        ...studentColumns<ChatLogRow>({ student: t("fields.student"), class: t("fields.class") }, embedded),
        {
          key: "is_blocked",
          title: t("fields.blocked"),
          width: 130,
          filter: { type: "select", param: "blocked", options: statusOptions(BLOCKED_STATUS, tr) },
          render: (v: boolean | undefined) => <StatusBadge map={BLOCKED_STATUS} value={Boolean(v)} />,
        },
        timeColumn<ChatLogRow>(t("fields.time"), embedded),
      ]),
    [t, tr, embedded],
  );

  return (
    <ReportListCard<ChatLogRow>
      tableKey={embedded ? "report-student-chat-logs" : "report-chat-logs"}
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("chat.entity")}
      searchPlaceholder={t("chat.searchPlaceholder")}
      scoped={!embedded}
      footnote={embedded ? t("detail.dateHint") : undefined}
    >
      <ChatLogDrawer id={detailId} onClose={() => setDetailId(null)} />
    </ReportListCard>
  );
}
