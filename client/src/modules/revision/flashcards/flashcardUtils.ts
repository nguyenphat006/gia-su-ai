import type { Flashcard } from "./types";

/** `cards` từ API / bản nháp AI -> mảng {front, back} chuỗi (bỏ phần tử hỏng) */
export function normalizeCards(raw: unknown): Flashcard[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c) => {
    if (!c || typeof c !== "object") return [];
    const { front, back } = c as Record<string, unknown>;
    return [{ front: front == null ? "" : String(front), back: back == null ? "" : String(back) }];
  });
}

/** Payload thẻ: cắt khoảng trắng, bỏ thẻ trống hoàn toàn */
export function cardsPayload(cards: Flashcard[]): Flashcard[] {
  return cards.map((c) => ({ front: c.front.trim(), back: c.back.trim() })).filter((c) => c.front || c.back);
}
