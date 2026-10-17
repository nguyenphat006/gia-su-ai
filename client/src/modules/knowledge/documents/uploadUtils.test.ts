import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, formatBytes, validateUploadFile } from "./uploadUtils";

describe("validateUploadFile", () => {
  it("nhận PDF / DOCX / TXT không phân biệt hoa thường", () => {
    expect(validateUploadFile({ name: "Bai-giang.PDF", size: 1000 })).toBeNull();
    expect(validateUploadFile({ name: "a.docx", size: 1000 })).toBeNull();
    expect(validateUploadFile({ name: "a.txt", size: MAX_UPLOAD_BYTES })).toBeNull();
  });

  it("từ chối định dạng khác và tệp quá 50MB", () => {
    expect(validateUploadFile({ name: "a.doc", size: 10 })).toBe("fileType");
    expect(validateUploadFile({ name: "a.pdf", size: MAX_UPLOAD_BYTES + 1 })).toBe("fileSize");
  });
});

describe("formatBytes", () => {
  it("đổi đơn vị", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
