import { createCrudService } from "@/lib/api/crud";
import type { UnitCreateInput, UnitFilters, UnitOfMeasureItem, UnitUpdateInput } from "../types";

/** CRUD + statistics + batch actions chuẩn cho `/units/` (BaseERPViewSet). */
export const unitService = createCrudService<UnitOfMeasureItem, UnitCreateInput, UnitUpdateInput, UnitFilters>("/units/");
