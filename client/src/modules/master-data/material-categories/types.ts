export interface MaterialCategoryItem {
  id: number;
  code: string;
  name: string;
  parent?: number | null;
  parent_code?: string | null;
  parent_name?: string | null;
  children_count?: number;
  sort_order: number;
  description?: string | null;
  is_active: boolean;
  created_by_name?: string;
  updated_by_name?: string;
  created_at?: string;
  updated_at?: string;
  children?: MaterialCategoryItem[];
}

export interface MaterialCategoryCreateInput {
  code: string;
  name: string;
  parent?: number | null;
  sort_order?: number;
  description?: string;
  is_active?: boolean;
}

export interface MaterialCategoryUpdateInput {
  name: string;
  parent?: number | null;
  sort_order?: number;
  description?: string;
  is_active?: boolean;
}

export interface MaterialCategoryFilters {
  search?: string;
  parent?: number | string;
  is_active?: boolean | string;
  page?: number;
  page_size?: number;
}

export interface MaterialCategoryTreeItem {
  id: number;
  key: number;
  value: number;
  title: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  children?: MaterialCategoryTreeItem[];
}
