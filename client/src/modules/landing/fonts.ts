import { Baloo_2, Be_Vietnam_Pro } from "next/font/google";

// Font riêng trang chủ công khai (chỉ nạp ở trang dùng tới): tiêu đề tròn, nội dung dễ đọc tiếng Việt
export const displayFont = Baloo_2({
  subsets: ["vietnamese", "latin"],
  variable: "--font-landing-display",
  display: "swap",
});

export const bodyFont = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-body",
  display: "swap",
});
