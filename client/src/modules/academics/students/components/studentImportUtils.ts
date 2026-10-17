import * as XLSX from "xlsx";
import type { ImportCredential } from "../types";

/**
 * Tiêu đề cột file nhập — là hợp đồng dữ liệu với backend (`StudentViewSet.import_excel` đọc đúng các tên này),
 * nên giữ nguyên tiếng Việt, không dịch theo ngôn ngữ giao diện.
 */
export const STUDENT_IMPORT_HEADERS = ["Họ và tên", "Mã học sinh", "Khối", "Mã lớp", "Tên đăng nhập", "Email", "Mật khẩu"] as const;

const SAMPLE_ROW = ["Nguyễn Văn An", "HS001", 6, "6A1", "", "", ""];

/** Tạo và tải file mẫu nhập học sinh (.xlsx) */
export function downloadStudentTemplate(fileName: string) {
  const ws = XLSX.utils.aoa_to_sheet([[...STUDENT_IMPORT_HEADERS], SAMPLE_ROW]);
  ws["!cols"] = STUDENT_IMPORT_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "HocSinh");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/** Tải danh sách tài khoản + mật khẩu ban đầu vừa sinh (.xlsx) */
export function downloadCredentials(
  rows: ImportCredential[],
  headers: { studentCode: string; fullName: string; username: string; initialPassword: string },
  passwordSetInFile: string,
  fileName: string,
) {
  const data = [
    [headers.studentCode, headers.fullName, headers.username, headers.initialPassword],
    ...rows.map((r) => [r.student_code, r.full_name, r.username, r.initial_password ?? passwordSetInFile]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "MatKhau");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
