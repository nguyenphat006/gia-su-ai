import { describe, expect, it } from "vitest";
import { buildQuestionPayload, draftToPayload, EMPTY_QUESTION, hasDuplicateOptions, normalizeOptions, toQuestionValues } from "./questionPayload";
import type { QuestionItem } from "./types";

describe("buildQuestionPayload", () => {
  it("trắc nghiệm: gửi 4 phương án và đáp án là chữ của phương án được chọn", () => {
    const payload = buildQuestionPayload({
      ...EMPTY_QUESTION,
      grade: "7",
      topic: " Quang hợp ",
      content: " Sản phẩm của quang hợp là gì? ",
      options: [" Oxi ", "Nitơ", "Heli", "Neon"],
      correct_index: "0",
    });
    expect(payload).toMatchObject({ grade: 7, topic: "Quang hợp", options: ["Oxi", "Nitơ", "Heli", "Neon"], correct_answer: "Oxi", school_class: null });
    expect(payload.content).toBe("Sản phẩm của quang hợp là gì?");
  });

  it("tự luận: options null, đáp án mẫu lấy từ ô riêng; khối trống = dùng chung", () => {
    const payload = buildQuestionPayload({ ...EMPTY_QUESTION, question_type: "ESSAY", topic: "Lực", content: "Nêu định luật I Newton", sample_answer: " Mọi vật giữ nguyên trạng thái… ", options: ["a", "b", "c", "d"], correct_index: "1" });
    expect(payload).toMatchObject({ grade: null, options: null, correct_answer: "Mọi vật giữ nguyên trạng thái…", explanation: null, hint: null });
  });
});

describe("toQuestionValues", () => {
  it("tìm lại chỉ số phương án đúng và đủ 4 ô", () => {
    const item = { grade: null, school_class: null, topic: "T", question_type: "MULTIPLE_CHOICE", difficulty: "VAN_DUNG", content: "C", options: ["x", "y", "z"], correct_answer: "y", explanation: null, hint: null, status: "PENDING", is_active: true } as unknown as QuestionItem;
    const values = toQuestionValues(item);
    expect(values.options).toEqual(["x", "y", "z", ""]);
    expect(values.correct_index).toBe("1");
    expect(values.grade).toBeNull();
  });
});

describe("helpers", () => {
  it("normalizeOptions chịu được dữ liệu không phải mảng", () => {
    expect(normalizeOptions(null)).toEqual(["", "", "", ""]);
  });

  it("hasDuplicateOptions bỏ qua ô trống, so sánh sau khi cắt khoảng trắng", () => {
    expect(hasDuplicateOptions(["a", "", "", "b"])).toBe(false);
    expect(hasDuplicateOptions(["a", " a", "c", "d"])).toBe(true);
  });

  it("draftToPayload lấy khối / chủ đề từ yêu cầu và đặt trạng thái Đã duyệt", () => {
    const payload = draftToPayload(
      { content: "Q", options: ["1", "2", "3", "4"], correct_answer: "2", explanation: null, hint: null, difficulty: "la", question_type: "MULTIPLE_CHOICE" },
      { grade: "8", topic: " Điện " },
    );
    expect(payload).toMatchObject({ grade: 8, topic: "Điện", status: "APPROVED", difficulty: "NHAN_BIET", options: ["1", "2", "3", "4"] });
  });
});
