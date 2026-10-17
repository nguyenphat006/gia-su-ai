import type { Schemas } from "@/types/api";

/** Đơn vị tính — sinh từ OpenAPI (UnitOfMeasureSerializer) */
export type UnitOfMeasureItem = Schemas["UnitOfMeasure"];

/** Payload tạo mới — sinh từ OpenAPI (UnitOfMeasureCreateUpdateSerializer) */
export type UnitCreateInput = Schemas["UnitOfMeasureCreateUpdateRequest"];

/** Payload cập nhật — mã ĐVT không đổi sau khi tạo */
export type UnitUpdateInput = Omit<UnitCreateInput, "code">;

export interface UnitFilters {
  search?: string;
  is_active?: boolean | string;
  page?: number;
  page_size?: number;
}
