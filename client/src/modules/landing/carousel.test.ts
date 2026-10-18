import { describe, expect, it } from "vitest";
import { stepIndex, swipeDelta } from "./carousel";

describe("stepIndex", () => {
  it("tiến và quay về đầu", () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(2, 1, 3)).toBe(0);
  });

  it("lùi từ slide đầu về slide cuối", () => {
    expect(stepIndex(0, -1, 3)).toBe(2);
  });

  it("không có slide -> 0", () => {
    expect(stepIndex(1, 1, 0)).toBe(0);
  });
});

describe("swipeDelta", () => {
  it("vuốt trái đủ xa -> slide sau", () => {
    expect(swipeDelta(200, 100)).toBe(1);
  });

  it("vuốt phải đủ xa -> slide trước", () => {
    expect(swipeDelta(100, 200)).toBe(-1);
  });

  it("chạm nhẹ không đổi slide", () => {
    expect(swipeDelta(100, 120)).toBe(0);
  });
});
