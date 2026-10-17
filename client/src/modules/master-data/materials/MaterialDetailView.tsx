"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DetailPage } from "@/components/detail";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useMaterialDetail, useUpdateMaterialMutation, useDeleteMaterialMutation } from "./hooks/useMaterialsQuery";
import { useMaterialCategoryTree } from "../material-categories/hooks/useMaterialCategoriesQuery";
import type { MaterialCategoryTreeItem } from "../material-categories/types";
import { MaterialDetailSpecsTab } from "./components/MaterialDetailSpecsTab";
import { MaterialFormModal } from "./components/MaterialFormModal";
import { useMaterialHero } from "./hero";
import type { MaterialFormValues, MaterialItem } from "./types";

const NO_CATEGORIES: MaterialCategoryTreeItem[] = [];
const LIST_HREF = "/master-data/materials";

export interface MaterialDetailViewProps {
  materialId: number;
}

export function MaterialDetailView({ materialId }: MaterialDetailViewProps) {
  const router = useRouter();
  const t = useTranslations("materials");
  const tc = useTranslations("common");
  const materialHero = useMaterialHero();
  const { can } = usePermission();
  const [editOpen, setEditOpen] = useState(false);

  const query = useMaterialDetail(materialId);
  const updateMutation = useUpdateMaterialMutation();
  const deleteMutation = useDeleteMaterialMutation();

  // Dữ liệu cho form sửa: chỉ tải khi mở form
  // Cây nhóm chỉ tải khi mở form sửa; đợi tải xong mới hiện form (ô Nhóm + khối quy cách kim loại đúng ngay từ đầu)
  const { data: categoryTree = NO_CATEGORIES, isSuccess: treeReady } = useMaterialCategoryTree({ enabled: editOpen });

  const handleEditSubmit = async (values: MaterialFormValues) => {
    await updateMutation.mutateAsync({ id: materialId, data: values });
    toast.success(tc("messages.updated", { entity: t("entity") }));
    setEditOpen(false);
  };

  return (
    <DetailPage<MaterialItem>
      query={query}
      backHref={LIST_HREF}
      entityLabel={t("entity")}
      hero={materialHero}
      onEdit={can(PERMISSIONS.MATERIAL.UPDATE) ? () => setEditOpen(true) : undefined}
      moreActions={(m) => [
        {
          key: "delete",
          label: tc("actions.delete"),
          icon: <Trash2 />,
          danger: true,
          confirm: {
            title: tc("messages.deleteTitle", { entity: t("entity"), name: m.material_name }),
            content: tc("messages.deleteIrreversible"),
            okText: tc("actions.delete"),
          },
          onClick: can(PERMISSIONS.MATERIAL.DELETE)
            ? async () => {
                await deleteMutation.mutateAsync(m.id);
                toast.success(tc("messages.deleted", { entity: t("entity") }));
                router.push(LIST_HREF);
              }
            : undefined,
        },
      ]}
      tabs={(m) => (m.metal_spec ? [{ key: "specs", label: t("specs.tab"), children: <MaterialDetailSpecsTab material={m} /> }] : [])}
      attachments={{ entityType: "Material", entityId: materialId, readonly: !can(PERMISSIONS.MATERIAL.UPDATE) }}
      audit={{ model: "master_data.material", objectId: materialId }}
    >
      {query.data && (
        <MaterialFormModal
          open={editOpen && treeReady}
          onCancel={() => setEditOpen(false)}
          onSubmit={handleEditSubmit}
          loading={updateMutation.isPending}
          initialData={query.data}
          categoryTree={categoryTree}
        />
      )}
    </DetailPage>
  );
}
