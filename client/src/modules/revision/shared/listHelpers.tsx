"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { RelativeTime, type BulkAction, type ListColumn } from "@/components/list";
import type { MessageKey } from "@/i18n/types";
import type { BatchEnvelope } from "@/lib/api/crud";
import { gradeOptions } from "@/modules/academics/shared/grades";
import { ORIGIN_STATUS } from "./scope";

/** Bộ dịch dùng cho các cột chung: `tr` = useTranslations() (không namespace) */
export interface ColumnTranslators {
  tr: (key: MessageKey) => string;
  tc: ReturnType<typeof useTranslations<"common">>;
  ta: ReturnType<typeof useTranslations<"academics">>;
  tv: ReturnType<typeof useTranslations<"revision">>;
}

/** Cột khối: null = "Dùng chung" */
export function gradeColumn<T>({ ta, tv }: ColumnTranslators, sortable = true): ListColumn<T> {
  return {
    key: "grade",
    title: ta("gradeLabel"),
    width: 110,
    sortable,
    filter: { type: "select", options: gradeOptions(ta) },
    render: (v: number | null) => (v == null ? <span className="text-muted-foreground">{tv("sharedGrade")}</span> : ta("grade", { grade: v })),
  };
}

export function originColumn<T>({ tr, tv }: ColumnTranslators): ListColumn<T> {
  return {
    key: "origin",
    title: tv("fields.origin"),
    width: 130,
    filter: { type: "select", options: statusOptions(ORIGIN_STATUS, tr) },
    render: (v) => <StatusBadge map={ORIGIN_STATUS} value={v} />,
  };
}

export function activeColumn<T>({ tr, tc }: ColumnTranslators): ListColumn<T> {
  return {
    key: "is_active",
    title: tc("fields.status"),
    width: 130,
    filter: { type: "select", options: statusOptions(ACTIVE_STATUS, tr) },
    render: (v) => <StatusBadge map={ACTIVE_STATUS} value={v} />,
  };
}

export function updatedAtColumn<T extends { updated_by_name?: string }>({ tc }: ColumnTranslators): ListColumn<T> {
  return {
    key: "updated_at",
    title: tc("fields.updatedAt"),
    width: 140,
    sortable: true,
    filter: { type: "date" },
    render: (v, r) => <RelativeTime value={v} by={r.updated_by_name} />,
  };
}

const showBatchResult = (res: BatchEnvelope) => (res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message));

interface StandardBulkOptions {
  canUpdate: boolean;
  canDelete: boolean;
  entity: string;
  batchStatus: (args: { ids: number[]; isActive: boolean }) => Promise<BatchEnvelope>;
  batchDelete: (ids: number[]) => Promise<BatchEnvelope>;
}

/** Thao tác hàng loạt chuẩn: kích hoạt / ngưng / xóa (theo quyền) */
export function useStandardBulkActions({ canUpdate, canDelete, entity, batchStatus, batchDelete }: StandardBulkOptions): BulkAction[] {
  const tc = useTranslations("common");
  return [
    ...(canUpdate
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus({ ids, isActive: false })) },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: "delete",
            label: tc("actions.delete"),
            icon: <Trash2 />,
            danger: true,
            confirm: {
              title: (n: number) => tc("messages.bulkDeleteTitle", { count: n, entity }),
              content: tc("messages.deleteIrreversible"),
              okText: tc("actions.delete"),
            },
            onClick: async (ids: number[]) => showBatchResult(await batchDelete(ids)),
          },
        ]
      : []),
  ];
}

/** Rút gọn nội dung dài cho tiêu đề hộp xác nhận */
export const shorten = (text: string, max = 60) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
