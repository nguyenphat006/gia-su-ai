/**
 * Chuẩn hóa dấu bao công thức của AI về cú pháp remark-math:
 * `\[ … \]` -> `$$ … $$`, `\( … \)` -> `$ … $`. Phần còn lại giữ nguyên.
 */
export function normalizeMath(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, body: string) => `$$${body}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, body: string) => `$${body}$`);
}
