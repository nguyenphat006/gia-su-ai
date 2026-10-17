import { http } from "@/lib/api/axiosClient";
import { createCrudService } from "@/lib/api/crud";
import type {
  MaterialCategoryCreateInput,
  MaterialCategoryFilters,
  MaterialCategoryItem,
  MaterialCategoryTreeItem,
  MaterialCategoryUpdateInput,
} from "../types";

const RESOURCE = "/material-categories/";

export const materialCategoryService = {
  ...createCrudService<
    MaterialCategoryItem,
    MaterialCategoryCreateInput,
    MaterialCategoryUpdateInput,
    MaterialCategoryFilters
  >(RESOURCE),

  /** Cây phân cấp cha - con cho TreeSelect / Tree Table */
  getTree: () => http.get<MaterialCategoryTreeItem[]>(`${RESOURCE}tree/`),

  /** Di chuyển thứ tự hiển thị trong cùng nhóm cha */
  moveOrder: (id: number, direction: "up" | "down") =>
    http.post<null>(`${RESOURCE}${id}/move-order/`, { direction }),
};
