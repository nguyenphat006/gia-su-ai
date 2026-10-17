import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu sinh từ OpenAPI (serializer backend) — chạy `npm run gen:api` khi backend đổi. */
export type AiSettingItem = Schemas["AiSetting"];
export type AiSettingValueType = Schemas["ValueTypeEnum"];
export type AiSettingCreateInput = Schemas["AiSettingCreateUpdateRequest"];
export type AiSettingUpdateInput = Schemas["PatchedAiSettingCreateUpdateRequest"];

export interface AiSettingFilters {
  search?: string;
  is_active?: boolean;
  value_type?: AiSettingValueType;
  page?: number;
  page_size?: number;
  ordering?: string;
}
