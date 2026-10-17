import { describe, expect, it } from "vitest";
import { apiOrigin, arenaSocketUrl, resolveApiAsset } from "./apiUrls";

describe("apiOrigin", () => {
  it("bỏ hậu tố /api/v1 và dấu / cuối", () => {
    expect(apiOrigin("http://localhost:8000/api/v1")).toBe("http://localhost:8000");
    expect(apiOrigin("https://api.example.com/api/v1/")).toBe("https://api.example.com");
    expect(apiOrigin("https://example.com/backend/api/v1")).toBe("https://example.com/backend");
  });
});

describe("resolveApiAsset", () => {
  it("ghép đường dẫn API tương đối với gốc backend", () => {
    expect(resolveApiAsset("/api/v1/attachments/5/file/?sig=abc", "http://127.0.0.1:8000/api/v1")).toBe(
      "http://127.0.0.1:8000/api/v1/attachments/5/file/?sig=abc",
    );
    expect(resolveApiAsset("media/a.png", "https://x.vn/api/v1")).toBe("https://x.vn/media/a.png");
  });

  it("giữ nguyên URL tuyệt đối / blob", () => {
    expect(resolveApiAsset("https://cdn.vn/a.png", "http://h/api/v1")).toBe("https://cdn.vn/a.png");
    expect(resolveApiAsset("blob:http://localhost/123", "http://h/api/v1")).toBe("blob:http://localhost/123");
  });
});

describe("arenaSocketUrl", () => {
  it("suy từ API URL: http -> ws, https -> wss, bỏ /api/v1", () => {
    expect(arenaSocketUrl("tok", { apiUrl: "http://localhost:8000/api/v1", wsUrl: "" })).toBe("ws://localhost:8000/ws/arena/?token=tok");
    expect(arenaSocketUrl("tok", { apiUrl: "https://api.school.vn/api/v1/", wsUrl: "" })).toBe("wss://api.school.vn/ws/arena/?token=tok");
  });

  it("ưu tiên NEXT_PUBLIC_WS_URL", () => {
    expect(arenaSocketUrl("tok", { wsUrl: "wss://ws.school.vn/", apiUrl: "http://x/api/v1" })).toBe("wss://ws.school.vn/ws/arena/?token=tok");
    expect(arenaSocketUrl("tok", { wsUrl: "wss://ws.school.vn/ws/arena" })).toBe("wss://ws.school.vn/ws/arena/?token=tok");
  });

  it("mã hóa token", () => {
    expect(arenaSocketUrl("a b+c", { apiUrl: "http://h/api/v1", wsUrl: "" })).toBe("ws://h/ws/arena/?token=a%20b%2Bc");
  });
});
