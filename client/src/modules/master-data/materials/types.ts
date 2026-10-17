/**
 * Các loại hình dạng tiết diện mặt cắt phôi kim loại.
 */
export type ProfileShape =
  | 'ROUND_PIPE'    // Ống tròn rỗng (P) - Ø*t*L
  | 'SOLID_ROUND'   // Tròn đặc (D) - Ø*L D
  | 'SQUARE_TUBE'   // Hộp vuông rỗng (V) - a*t*L
  | 'SOLID_SQUARE'  // Vuông đặc (V...D) - a*L D
  | 'RECT_TUBE'     // Hộp chữ nhật rỗng (CN) - a*b*t*L
  | 'OVAL_PIPE'     // Oval / Elip rỗng (ELIP) - a*b*t*L
  | 'FLAT_BAR'      // La / Dẹt đặc (L) - t*w*L
  | 'ANGLE_V'       // Thép V / Nhôm V
  | 'SHEET'         // Nhôm / Sắt tấm (T) - W*L*t
  | 'SPECIAL_MOLD'; // Khuôn định hình đặc biệt (SP)

/**
 * Thông số kỹ thuật chi tiết của phôi kim loại (Quan hệ 1-1 với Material).
 */
export interface MetalMaterialSpecItem {
  profile_shape: ProfileShape;
  profile_shape_display?: string;
  outer_dimension_1: number | null; // Đường kính ngoài Ø (P, D) hoặc Cạnh nhỏ a (CN, V) hoặc Rộng w (L)
  outer_dimension_2: number | null; // Cạnh lớn b (CN, Oval) hoặc Chiều cao (V)
  thickness: number | null;         // Độ dày thành t (mm)
  standard_bar_length: number;      // Chiều dài cây tiêu chuẩn L (mm), mặc định 6000
  end_trim_loss: number;            // Chiều dài hao hụt cắt đầu mẩu bavia (mm), mặc định 50
  saw_kerf_loss: number;            // Bề dày mạch cưa mỗi nhát cắt (mm), mặc định 3
  weight_per_meter_kg: number | null; // Định lượng kg/m thực tế theo khuôn NCC/danh mục VT
  mold_code: string;                // Mã khuôn ép NCC (AM-1203, PM029-T15...)
  features: string;                 // Ký hiệu phụ (G: Gân, GG: Gân+Gờ, GO: Gờ, MEM: Nhôm mềm, R=3: Bo góc...)
  description?: string;
}

/**
 * Dữ liệu bản ghi Nguyên Vật Liệu hoàn chỉnh từ Backend API.
 */
export interface MaterialItem {
  id: number;
  material_code: string;
  material_name: string;
  category_id: number;
  category_code: string;
  category_name: string;
  category_parent_id: number | null;
  base_uom_id: number;
  base_uom_code: string;
  base_uom_name: string;
  image_url: string;
  metal_spec: MetalMaterialSpecItem | null;
  description: string;
  is_active: boolean;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Form dữ liệu gửi lên API khi Tạo mới hoặc Chỉnh sửa Nguyên vật liệu.
 */
export interface MaterialFormValues {
  material_code: string;
  material_name: string;
  category: number;
  base_uom: number;
  image_url?: string;
  description?: string;
  is_active?: boolean;
  metal_spec?: Partial<MetalMaterialSpecItem> | null;
}

/**
 * Tham số bộ lọc và phân trang API Materials.
 */
export interface MaterialQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: number;
  base_uom?: number;
  profile_shape?: string;
  is_active?: boolean | string;
  ordering?: string;
}
