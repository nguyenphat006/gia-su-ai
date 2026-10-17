import { describe, expect, it } from "vitest";
import { accountPayload } from "./AccountFields";
import { gradeOptions } from "./grades";

const base = { username: "  hs001 ", full_name: " Nguyễn An ", email: " ", password: "" };

describe("accountPayload", () => {
  it("tạo mới: bỏ mật khẩu trống (server tự sinh), giữ tên đăng nhập đã nhập", () => {
    expect(accountPayload(base, false)).toEqual({ full_name: "Nguyễn An", email: "", username: "hs001" });
  });

  it("tạo mới: tên đăng nhập trống thì không gửi (server dùng mã học sinh)", () => {
    expect(accountPayload({ ...base, username: " " }, false)).not.toHaveProperty("username");
  });

  it("sửa: không gửi tên đăng nhập, chỉ gửi mật khẩu khi có nhập", () => {
    expect(accountPayload(base, true)).toEqual({ full_name: "Nguyễn An", email: "" });
    expect(accountPayload({ ...base, password: "Secret123" }, true)).toEqual({ full_name: "Nguyễn An", email: "", password: "Secret123" });
  });
});

describe("gradeOptions", () => {
  it("trả 4 khối THCS với giá trị chuỗi", () => {
    const opts = gradeOptions((_key, { grade }) => `Khối ${grade}`);
    expect(opts).toEqual([
      { value: "6", label: "Khối 6" },
      { value: "7", label: "Khối 7" },
      { value: "8", label: "Khối 8" },
      { value: "9", label: "Khối 9" },
    ]);
  });
});
