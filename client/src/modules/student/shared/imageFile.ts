/** Kiểm tra ảnh gửi kèm (gia sư AI, bài tự luận): jpg / png / webp, tối đa 5MB — khớp kiểm tra ở server. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_MB = 5;
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

export type ImageProblem = "type" | "size" | null;

export function validateImageFile(file: Pick<File, "type" | "size">): ImageProblem {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return "type";
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return "size";
  return null;
}
