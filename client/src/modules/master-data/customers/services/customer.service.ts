import { http } from "@/lib/api/axiosClient";
import { createCrudService } from "@/lib/api/crud";
import type { CustomerCreateInput, CustomerFilters, CustomerItem, CustomerUpdateInput } from "../types";

const RESOURCE = "/customers/";

/** CRUD + statistics + batch actions chuẩn cho `/customers/` (BaseERPViewSet) + tải logo. */
export const customerService = {
  ...createCrudService<CustomerItem, CustomerCreateInput, CustomerUpdateInput, CustomerFilters>(RESOURCE),

  /** Tải logo trước khi lưu form → trả URL gửi kèm `logo_url` */
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await http.post<{ image_url: string; file_name: string }>(`${RESOURCE}upload-logo/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.image_url;
  },
};
