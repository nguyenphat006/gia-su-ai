/** Hàm thuần cho bài kiểm tra flashcard: mỗi thẻ hỏi mặt trước, 4 lựa chọn = mặt sau đúng + 3 mặt sau của thẻ khác. */
import type { FlashCard } from "../shared/types";

export const FLASHCARD_CHOICES = 4;

export interface FlashcardQuestion {
  cardIndex: number;
  front: string;
  options: string[];
}

/** Xáo trộn Fisher–Yates (không đổi mảng gốc) */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Lựa chọn cho thẻ `index`: mặt sau đúng + tối đa 3 mặt sau khác (bỏ trùng nội dung).
 * Bộ ít hơn 4 thẻ -> dùng số mặt sau hiện có.
 */
export function buildFlashcardOptions(cards: readonly FlashCard[], index: number, random: () => number = Math.random): string[] {
  const correct = cards[index].back;
  const seen = new Set([correct.trim()]);
  const distractors: string[] = [];
  for (const back of shuffle(
    cards.filter((_, i) => i !== index).map((c) => c.back),
    random,
  )) {
    const key = back.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    distractors.push(back);
    if (distractors.length >= FLASHCARD_CHOICES - 1) break;
  }
  return shuffle([correct, ...distractors], random);
}

/** Đề kiểm tra cho cả bộ thẻ (giữ thứ tự thẻ) */
export function buildFlashcardQuiz(cards: readonly FlashCard[], random: () => number = Math.random): FlashcardQuestion[] {
  return cards.map((card, i) => ({ cardIndex: i, front: card.front, options: buildFlashcardOptions(cards, i, random) }));
}
