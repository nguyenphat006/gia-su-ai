import { http } from "@/lib/api/axiosClient";
import { createCrudService } from "@/lib/api/crud";
import type { MaterialFormValues, MaterialItem, MaterialQueryParams } from "../types";

const RESOURCE = "/materials/";

export interface MaterialNextCode {
  prefix: string;
  next_code: string;
  category_id: number;
  category_name: string;
}

export const materialService = {
  ...createCrudService<MaterialItem, MaterialFormValues, MaterialFormValues, MaterialQueryParams>(RESOURCE),

  /** Mã NVL gợi ý kế tiếp theo nhóm (VD: KL-00006). Mã chính thức do backend cấp khi lưu. */
  getNextCode: (categoryId: number) =>
    http.get<MaterialNextCode>(`${RESOURCE}next-code/`, { params: { category_id: categoryId } }),

  /** Tải lên ảnh đại diện / mặt cắt NVL */
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return http.post<{ image_url: string; file_name: string }>(`${RESOURCE}upload-image/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
