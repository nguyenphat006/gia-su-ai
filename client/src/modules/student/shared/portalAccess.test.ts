import { describe, expect, it } from "vitest";
import { hasAdminAccess, homePathFor, isStudentOnly } from "./portalAccess";

const student = { role_codes: ["STUDENT"], permissions: ["LEARN_VIEW", "LEARN_USE"] };
const teacher = { role_codes: ["TEACHER"], permissions: ["LEARN_VIEW", "LEARN_USE", "QUESTION_VIEW"] };

describe("portalAccess", () => {
  it("học sinh chỉ có quyền LEARN_* -> cổng học sinh", () => {
    expect(isStudentOnly(student)).toBe(true);
    expect(hasAdminAccess(student)).toBe(false);
    expect(homePathFor(student)).toBe("/learn");
  });

  it("giáo viên / quản trị -> trang quản trị", () => {
    expect(isStudentOnly(teacher)).toBe(false);
    expect(hasAdminAccess(teacher)).toBe(true);
    expect(homePathFor(teacher)).toBe("/");
    expect(homePathFor({ role_codes: ["ADMIN"], permissions: [] })).toBe("/");
    expect(hasAdminAccess({ is_superuser: true, role_codes: [], permissions: [] })).toBe(true);
  });

  it("học sinh được cấp thêm quyền quản trị không bị ép sang cổng học sinh", () => {
    expect(isStudentOnly({ role_codes: ["STUDENT"], permissions: ["LEARN_VIEW", "USER_VIEW"] })).toBe(false);
  });

  it("vai trò STUDENT + vai trò khác, hoặc chưa có user", () => {
    expect(isStudentOnly({ role_codes: ["STUDENT", "TEACHER"], permissions: ["LEARN_VIEW"] })).toBe(false);
    expect(isStudentOnly(null)).toBe(false);
    expect(homePathFor(undefined)).toBe("/");
  });

  it("đọc vai trò từ `roles` khi thiếu role_codes", () => {
    expect(isStudentOnly({ role_codes: [], roles: [{ id: 1, role_code: "STUDENT", role_name: "Học sinh" }], permissions: ["LEARN_VIEW"] })).toBe(true);
  });
});
