"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { defineColumns } from "@/components/list";
import { useArenaMatches } from "../../hooks/useReportsQuery";
import { buildListParams } from "../../listParams";
import { ARENA_MODE, MATCH_STATUS } from "../../statusMaps";
import type { ArenaMatchRow, ArenaParticipantRow } from "../../types";
import { PlayerScores } from "./PlayerScores";
import { ReportListCard } from "../ReportListCard";
import { ArenaMatchDrawer } from "./ArenaMatchDrawer";
import { timeColumn, type ReportListProps } from "./columns";

/** Lịch sử trận đấu trường: lọc chế độ; bấm chủ đề -> ngăn từng câu + nhận xét AI */
export function ArenaMatchList({ list, base, embedded }: ReportListProps) {
  const t = useTranslations("reports");
  const tr = useTranslations();
  const [detailId, setDetailId] = useState<number | null>(null);
  const params = useMemo(() => buildListParams(list.params, base, { scoped: !embedded }), [list.params, base, embedded]);
  const query = useArenaMatches(params);

  const columns = useMemo(
    () =>
      defineColumns<ArenaMatchRow>([
        {
          key: "topic",
          title: t("fields.topic"),
          width: 220,
          pinned: "left",
          hideable: false,
          render: (v: string, r) => (
            <button type="button" title={v} className="block max-w-full truncate text-left font-medium text-primary hover:underline" onClick={() => setDetailId(r.id)}>
              {v}
            </button>
          ),
        },
        {
          key: "mode",
          title: t("fields.mode"),
          width: 140,
          filter: { type: "select", options: statusOptions(ARENA_MODE, tr) },
          render: (v) => <StatusBadge map={ARENA_MODE} value={v} />,
        },
        { key: "participants", title: t("fields.players"), width: 320, render: (v: ArenaParticipantRow[]) => <PlayerScores participants={v} /> },
        { key: "total_questions", title: t("arena.questions"), width: 90, align: "right" },
        { key: "status", title: tr("common.fields.status"), width: 130, render: (v) => <StatusBadge map={MATCH_STATUS} value={v} /> },
        timeColumn<ArenaMatchRow>(t("fields.time"), embedded),
      ]),
    [t, tr, embedded],
  );

  return (
    <ReportListCard<ArenaMatchRow>
      tableKey={embedded ? "report-student-arena" : "report-arena"}
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("arena.entity")}
      scoped={!embedded}
      searchable={false}
      footnote={embedded ? t("detail.dateHint") : undefined}
    >
      <ArenaMatchDrawer id={detailId} onClose={() => setDetailId(null)} />
    </ReportListCard>
  );
}
