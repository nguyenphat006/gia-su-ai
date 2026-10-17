import { describe, expect, it } from "vitest";
import { buildFlashcardOptions, buildFlashcardQuiz, shuffle } from "./flashcardQuiz";

const cards = [
  { front: "H2O", back: "Nước" },
  { front: "CO2", back: "Cacbon đioxit" },
  { front: "NaCl", back: "Muối ăn" },
  { front: "O2", back: "Oxi" },
  { front: "N2", back: "Nitơ" },
  { front: "Fe", back: "Sắt" },
];

/** Bộ sinh số giả ngẫu nhiên cố định để test lặp lại được */
function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("shuffle", () => {
  it("giữ đủ phần tử, không đổi mảng gốc", () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, seeded());
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("buildFlashcardOptions", () => {
  it("4 lựa chọn gồm đáp án đúng + 3 mặt sau khác, không trùng", () => {
    const options = buildFlashcardOptions(cards, 2, seeded());
    expect(options).toHaveLength(4);
    expect(options).toContain("Muối ăn");
    expect(new Set(options).size).toBe(4);
    for (const o of options) expect(cards.map((c) => c.back)).toContain(o);
  });

  it("bộ ít hơn 4 thẻ -> dùng số mặt sau hiện có", () => {
    const small = cards.slice(0, 2);
    const options = buildFlashcardOptions(small, 0, seeded());
    expect(options).toHaveLength(2);
    expect(options).toContain("Nước");
    expect(buildFlashcardOptions(cards.slice(0, 1), 0)).toEqual(["Nước"]);
  });

  it("bỏ mặt sau trùng nội dung với đáp án đúng", () => {
    const dup = [
      { front: "a", back: "X" },
      { front: "b", back: "X " },
      { front: "c", back: "Y" },
    ];
    const options = buildFlashcardOptions(dup, 0, seeded());
    expect(options.sort()).toEqual(["X", "Y"]);
  });
});

describe("buildFlashcardQuiz", () => {
  it("mỗi thẻ một câu, giữ thứ tự thẻ", () => {
    const quiz = buildFlashcardQuiz(cards, seeded());
    expect(quiz.map((q) => q.cardIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    quiz.forEach((q, i) => {
      expect(q.front).toBe(cards[i].front);
      expect(q.options).toContain(cards[i].back);
    });
  });
});
