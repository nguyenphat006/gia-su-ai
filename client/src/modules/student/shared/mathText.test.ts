import { describe, expect, it } from "vitest";
import { validateImageFile } from "./imageFile";
import { normalizeMath } from "./mathText";

describe("normalizeMath", () => {
  it("đổi \\( \\) và \\[ \\] sang $ / $$", () => {
    expect(normalizeMath("Lực \\(F = ma\\) và")).toBe("Lực $F = ma$ và");
    expect(normalizeMath("\\[v = \\frac{s}{t}\\]")).toBe("$$v = \\frac{s}{t}$$");
    expect(normalizeMath("a\n\\[\nx^2\n\\]\nb")).toBe("a\n$$\nx^2\n$$\nb");
  });

  it("giữ nguyên nội dung đã dùng $ và chuỗi rỗng", () => {
    expect(normalizeMath("$x$ và $$y$$")).toBe("$x$ và $$y$$");
    expect(normalizeMath("")).toBe("");
  });
});

describe("validateImageFile", () => {
  it("chỉ nhận jpg / png / webp tối đa 5MB", () => {
    expect(validateImageFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateImageFile({ type: "image/gif", size: 1000 })).toBe("type");
    expect(validateImageFile({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toBe("size");
  });
});
