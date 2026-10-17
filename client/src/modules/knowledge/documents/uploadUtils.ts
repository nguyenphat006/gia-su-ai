/** Kiểm tra tệp tải lên trước khi gửi (backend kiểm tra lại) */
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

export type UploadFileError = "fileType" | "fileSize" | null;

export function validateUploadFile(file: Pick<File, "name" | "size">): UploadFileError {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) return "fileType";
  if (file.size > MAX_UPLOAD_BYTES) return "fileSize";
  return null;
}

/** Dung lượng dễ đọc: 1.5 MB */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
