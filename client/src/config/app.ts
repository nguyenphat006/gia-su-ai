/**
 * Nhận diện ứng dụng DỰ PHÒNG: giá trị thật lấy từ Cấu hình hệ thống (Cài đặt → Cấu hình hệ thống, `useSystemSettings`).
 * Dùng khi API chưa trả và cho metadata tĩnh (tiêu đề tab mặc định).
 * (Màu sắc: src/app/globals.css (biến --c-*))
 */
export const APP_CONFIG = {
  /** Tên hiển thị trên sidebar, trang đăng nhập, tiêu đề tab trình duyệt */
  name: "Gia Sư AI KHTN",
  /** Nhãn phụ cạnh tên trên sidebar (để trống nếu không cần) */
  badge: "THCS",
  /** Dòng mô tả ngắn dưới tên trên sidebar */
  tagline: "Học KHTN cùng trợ lý AI",
  /** Mô tả dùng cho thẻ meta / trang đăng nhập */
  description: "Nền tảng học Khoa học Tự nhiên THCS với gia sư AI, ôn tập thông minh và đấu trường trí tuệ",
  /** Đơn vị sở hữu (khớp mặc định `company_name` ở backend) — hiện dưới tên ứng dụng, footer */
  owner: "Trường THCS Phước Tân 3",
} as const;

/** Khóa localStorage dùng chung (đổi tiền tố khi clone để tránh đụng dữ liệu giữa các dự án chạy cùng domain) */
export const STORAGE_KEYS = {
  themeMode: "giasu_theme_mode",
  /** Lịch sử tìm kiếm toàn cục (mục mở gần đây + từ khóa), thêm hậu tố _<userId> */
  recentSearch: "giasu_recent_search",
} as const;
