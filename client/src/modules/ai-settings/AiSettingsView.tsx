"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, defineStatusMap, statusOptions } from "@/components/common/StatusBadge";
import { CodeText, ListPage, RelativeTime, defineColumns, useExcelExport, useListState, type BulkAction } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { AiSettingFormModal } from "./components/AiSettingFormModal";
import {
  useBatchDeleteAiSettingsMutation,
  useBatchStatusAiSettingsMutation,
  useCreateAiSettingMutation,
  useDeleteAiSettingMutation,
  useAiSettingsList,
  useUpdateAiSettingMutation,
} from "./hooks/useAiSettingsQuery";
import type { AiSettingCreateInput, AiSettingItem, AiSettingUpdateInput } from "./types";

const VALUE_TYPE_STATUS = defineStatusMap({
  TEXT: { label: "aiSettings.valueTypes.TEXT", tone: "neutral" },
  PROMPT: { label: "aiSettings.valueTypes.PROMPT", tone: "accent" },
  NUMBER: { label: "aiSettings.valueTypes.NUMBER", tone: "info" },
  BOOLEAN: { label: "aiSettings.valueTypes.BOOLEAN", tone: "success" },
});

const MAX_PREVIEW = 120;
const truncate = (v: string) => (v && v.length > MAX_PREVIEW ? `${v.slice(0, MAX_PREVIEW)}…` : v);

/**
 * Trang danh sách cấu hình AI — khung ListPage (docs/plan/ui-list-detail-design.md).
 * Thêm cột / bộ lọc: sửa `columns`; bộ lọc cột cần lookup tương ứng trong `filterset_fields` ở backend.
 * Khóa hệ thống (`is_system`): không xóa, không đổi khóa (backend chặn) — khóa ô chọn + nút xóa qua `protectedReason`.
 * Chữ hiển thị: messages/<vi|en>/aiSettings.json (rule frontend-i18n.md).
 */
export function AiSettingsView() {
  const t = useTranslations("aiSettings");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const { can } = usePermission();
  const list = useListState({ defaultOrdering: "key" });
  const query = useAiSettingsList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AiSettingItem | null>(null);

  const createMutation = useCreateAiSettingMutation();
  const updateMutation = useUpdateAiSettingMutation();
  const deleteMutation = useDeleteAiSettingMutation();
  const batchDelete = useBatchDeleteAiSettingsMutation();
  const batchStatus = useBatchStatusAiSettingsMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/ai-settings/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(
    () =>
      defineColumns<AiSettingItem>([
        { key: "key", title: t("fields.key"), width: 240, pinned: "left", hideable: false, sortable: true, filter: { type: "text" }, render: (v) => <CodeText>{v}</CodeText> },
        { key: "label", title: t("fields.label"), width: 220, sortable: true, filter: { type: "text" } },
        { key: "value", title: t("fields.value"), width: 320, ellipsis: true, render: (v: string) => <span className="font-mono text-xs">{truncate(v)}</span> },
        {
          key: "value_type",
          title: t("fields.valueType"),
          width: 130,
          filter: { type: "select", options: statusOptions(VALUE_TYPE_STATUS, tr) },
          render: (v) => <StatusBadge map={VALUE_TYPE_STATUS} value={v} />,
        },
        {
          key: "is_active",
          title: tc("fields.status"),
          width: 130,
          defaultHidden: true,
          filter: { type: "select", options: statusOptions(ACTIVE_STATUS, tr) },
          render: (v) => <StatusBadge map={ACTIVE_STATUS} value={v} />,
        },
        {
          key: "updated_at",
          title: tc("fields.updatedAt"),
          width: 140,
          sortable: true,
          filter: { type: "date" },
          render: (v, r) => <RelativeTime value={v} by={r.updated_by_name} />,
        },
      ]),
    [t, tc, tr],
  );

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: AiSettingCreateInput | AiSettingUpdateInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values as AiSettingUpdateInput });
      toast.success(tc("messages.updated", { entity: t("entity") }));
    } else {
      await createMutation.mutateAsync(values as AiSettingCreateInput);
      toast.success(tc("messages.created", { entity: t("entity") }));
    }
    setFormOpen(false);
  };

  const showBatchResult = (res: { message: string; data: { skipped?: unknown[] } }) =>
    res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message);

  const bulkActions: BulkAction[] = [
    ...(can(PERMISSIONS.AI_SETTING.UPDATE)
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: false })) },
        ]
      : []),
    ...(can(PERMISSIONS.AI_SETTING.DELETE)
      ? [
          {
            key: "delete",
            label: tc("actions.delete"),
            icon: <Trash2 />,
            danger: true,
            confirm: {
              title: (n: number) => tc("messages.bulkDeleteTitle", { count: n, entity: t("entity") }),
              content: tc("messages.deleteIrreversible"),
              okText: tc("actions.delete"),
            },
            onClick: async (ids: number[]) => showBatchResult(await batchDelete.mutateAsync(ids)),
          },
        ]
      : []),
  ];

  return (
    <ListPage<AiSettingItem>
      moduleCode="AI_SETTING"
      tableKey="ai-settings-table"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.AI_SETTING.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.AI_SETTING.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.AI_SETTING.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: t("entity") }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.key }),
        protectedReason: (r) => (r.is_system ? t("systemProtected") : null),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.AI_SETTING.EXPORT) ? openExport : undefined}
    >
      <AiSettingFormModal
        open={formOpen}
        editing={editing}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
        readOnly={Boolean(editing) && !can(PERMISSIONS.AI_SETTING.UPDATE)}
      />
      {exportModal}
    </ListPage>
  );
}

export default AiSettingsView;
