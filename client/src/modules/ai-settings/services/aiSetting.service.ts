import { createCrudService } from "@/lib/api/crud";
import type { AiSettingCreateInput, AiSettingFilters, AiSettingItem, AiSettingUpdateInput } from "../types";

/** CRUD + statistics + batch actions chuẩn cho `/ai-settings/` (BaseERPViewSet). Endpoint riêng: thêm bằng http.get/post. */
export const aiSettingService = createCrudService<
  AiSettingItem,
  AiSettingCreateInput,
  AiSettingUpdateInput,
  AiSettingFilters
>("/ai-settings/");
