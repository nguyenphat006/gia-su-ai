"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, CircleCheck, Trash2 } from "lucide-react";
import { ACTIVE_STATUS, StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { CodeText, ListPage, RelativeTime, defineColumns, useExcelExport, useListState, type BulkAction } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { CountryFlag } from "@/components/common/CountryFlag";
import { useCountryName, useCountryOptions } from "@/components/controls/useCountryOptions";
import { CustomerFormModal } from "./components/CustomerFormModal";
import {
  useBatchDeleteCustomersMutation,
  useBatchStatusCustomersMutation,
  useCreateCustomerMutation,
  useDeleteCustomerMutation,
  useCustomersList,
  useUpdateCustomerMutation,
} from "./hooks/useCustomersQuery";
import type { CustomerCreateInput, CustomerItem, CustomerUpdateInput } from "./types";

/**
 * Trang danh sách khách hàng — khung ListPage (docs/plan/ui-list-detail-design.md).
 * Thêm cột / bộ lọc: sửa `columns`; bộ lọc cột cần lookup tương ứng trong `filterset_fields` ở backend.
 * Cần trang chi tiết: tạo CustomerDetailView bằng <DetailPage> và thêm `link` cho cột tên.
 * Chữ hiển thị: messages/<vi|en>/customers.json (rule frontend-i18n.md).
 */
export function CustomersView() {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const { can } = usePermission();
  const countryOptions = useCountryOptions();
  const countryName = useCountryName();
  const list = useListState({ defaultOrdering: "-updated_at" });
  const query = useCustomersList(list.params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerItem | null>(null);

  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();
  const deleteMutation = useDeleteCustomerMutation();
  const batchDelete = useBatchDeleteCustomersMutation();
  const batchStatus = useBatchStatusCustomersMutation();

  const { openExport, exportModal } = useExcelExport({
    endpoint: "/customers/",
    label: t("title"),
    list,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(
    () =>
      defineColumns<CustomerItem>([
        {
          key: "logo_url",
          title: t("fields.logo"),
          width: 72,
          render: (v, r) =>
            v ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo nhỏ từ API
              <img src={v} alt={r.customer_name} className="list-thumb" loading="lazy" />
            ) : (
              <span className="list-thumb list-thumb--empty" aria-hidden />
            ),
        },
        {
          key: "customer_code",
          title: t("fields.code"),
          width: 140,
          pinned: "left",
          hideable: false,
          sortable: true,
          filter: { type: "text" },
          render: (v) => <CodeText>{v}</CodeText>,
        },
        { key: "customer_name", title: t("fields.name"), width: 260, sortable: true, ellipsis: true, filter: { type: "text" } },
        {
          key: "country",
          title: t("fields.country"),
          width: 190,
          sortable: true,
          filter: { type: "multiSelect", options: countryOptions },
          render: (v) =>
            v ? (
              <span className="inline-flex min-w-0 items-center gap-2">
                <CountryFlag code={v} />
                <span className="truncate">{countryName(v)}</span>
              </span>
            ) : null,
        },
        { key: "description", title: tc("fields.description"), width: 280, ellipsis: true, defaultHidden: true },
        {
          key: "is_active",
          title: tc("fields.status"),
          width: 130,
          filter: { type: "select", options: statusOptions(ACTIVE_STATUS, tr) },
          render: (v) => <StatusBadge map={ACTIVE_STATUS} value={v} />,
        },
        {
          key: "updated_at",
          title: tc("fields.updatedAt"),
          width: 150,
          sortable: true,
          filter: { type: "date" },
          render: (v, r) => <RelativeTime value={v} by={r.updated_by_name || r.created_by_name} />,
        },
      ]),
    [t, tc, tr, countryOptions, countryName],
  );

  // Lỗi được ném lại cho FormDialog gắn vào từng ô nhập
  const handleSubmit = async (values: CustomerCreateInput | CustomerUpdateInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values as CustomerUpdateInput });
      toast.success(tc("messages.updated", { entity: `"${values.customer_name}"` }));
    } else {
      await createMutation.mutateAsync(values as CustomerCreateInput);
      toast.success(tc("messages.created", { entity: `"${values.customer_name}"` }));
    }
    setFormOpen(false);
  };

  const showBatchResult = (res: { message: string; data: { skipped?: unknown[] } }) =>
    res.data.skipped?.length ? toast.warning(res.message) : toast.success(res.message);

  const bulkActions: BulkAction[] = [
    ...(can(PERMISSIONS.CUSTOMER.UPDATE)
      ? [
          { key: "activate", label: tc("actions.activate"), icon: <CircleCheck />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: true })) },
          { key: "deactivate", label: tc("actions.deactivate"), icon: <Ban />, onClick: async (ids: number[]) => showBatchResult(await batchStatus.mutateAsync({ ids, isActive: false })) },
        ]
      : []),
    ...(can(PERMISSIONS.CUSTOMER.DELETE)
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
    <ListPage<CustomerItem>
      moduleCode="CUSTOMER"
      tableKey="customers"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("entity")}
      searchPlaceholder={t("searchPlaceholder")}
      onCreate={can(PERMISSIONS.CUSTOMER.CREATE) ? () => { setEditing(null); setFormOpen(true); } : undefined}
      rowActions={{
        onEdit: can(PERMISSIONS.CUSTOMER.UPDATE) ? (r) => { setEditing(r); setFormOpen(true); } : undefined,
        onDelete: can(PERMISSIONS.CUSTOMER.DELETE)
          ? async (r) => {
              await deleteMutation.mutateAsync(r.id);
              toast.success(tc("messages.deleted", { entity: `"${r.customer_name}"` }));
            }
          : undefined,
        deleteTitle: (r) => tc("messages.deleteTitle", { entity: t("entity"), name: r.customer_name }),
      }}
      bulkActions={bulkActions}
      onExport={can(PERMISSIONS.CUSTOMER.EXPORT) ? openExport : undefined}
    >
      <CustomerFormModal
        open={formOpen}
        editing={editing}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />
      {exportModal}
    </ListPage>
  );
}

export default CustomersView;
