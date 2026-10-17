/** Hàm thuần dựng URL tới backend: ảnh có chữ ký (đường dẫn API tương đối) và WebSocket đấu trường. */

const DEFAULT_API_URL = "http://127.0.0.1:8000/api/v1";

/** Gốc backend: bỏ hậu tố `/api/v1` và dấu `/` cuối của NEXT_PUBLIC_API_URL */
export function apiOrigin(apiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL): string {
  return (apiUrl || DEFAULT_API_URL).replace(/\/+$/, "").replace(/\/api\/v1$/, "");
}

/** `/api/v1/attachments/5/file/?sig=..` -> `http://host:8000/api/v1/attachments/5/file/?sig=..`; URL tuyệt đối giữ nguyên */
export function resolveApiAsset(path: string, apiUrl?: string): string {
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  const origin = apiOrigin(apiUrl);
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * URL WebSocket đấu trường: ưu tiên NEXT_PUBLIC_WS_URL (gốc ws, vd. `wss://api.example.com`),
 * không có thì suy từ API URL (http -> ws, https -> wss, bỏ `/api/v1`). Kèm `?token=`.
 */
export function arenaSocketUrl(token: string, opts: { wsUrl?: string; apiUrl?: string } = {}): string {
  const wsBase = opts.wsUrl ?? process.env.NEXT_PUBLIC_WS_URL;
  let base: string;
  if (wsBase) {
    base = wsBase.replace(/\/+$/, "").replace(/\/ws\/arena$/, "");
  } else {
    base = apiOrigin(opts.apiUrl).replace(/^http(s?):/i, (_m, s: string) => `ws${s}:`);
  }
  return `${base}/ws/arena/?token=${encodeURIComponent(token)}`;
}
