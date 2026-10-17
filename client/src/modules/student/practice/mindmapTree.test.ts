import { describe, expect, it } from "vitest";
import { buildMindmapTree, countNodes } from "./mindmapTree";

describe("buildMindmapTree", () => {
  it("dựng cây từ danh sách phẳng, gốc là nút không có cha", () => {
    const tree = buildMindmapTree([
      { id: "a", label: "Chất", parentId: "root" },
      { id: "root", label: "Hóa học", parentId: null },
      { id: "b", label: "Nguyên tử", parentId: "a" },
      { id: "c", label: "Phân tử", parentId: "a" },
      { id: "d", label: "Phản ứng", parentId: "root" },
    ]);
    expect(tree?.label).toBe("Hóa học");
    expect(tree?.depth).toBe(0);
    expect(tree?.children.map((c) => c.id)).toEqual(["a", "d"]);
    expect(tree?.children[0].children.map((c) => [c.id, c.depth])).toEqual([
      ["b", 2],
      ["c", 2],
    ]);
    expect(countNodes(tree)).toBe(5);
  });

  it("nút mồ côi gắn vào gốc; id trùng chỉ lấy một lần", () => {
    const tree = buildMindmapTree([
      { id: "r", label: "Gốc", parentId: null },
      { id: "x", label: "Mồ côi", parentId: "khong-co" },
      { id: "x", label: "Trùng", parentId: "r" },
    ]);
    expect(tree?.children.map((c) => c.label)).toEqual(["Mồ côi"]);
    expect(countNodes(tree)).toBe(2);
  });

  it("vòng lặp không làm treo và không mất nút", () => {
    const tree = buildMindmapTree([
      { id: "r", label: "Gốc", parentId: null },
      { id: "p", label: "P", parentId: "q" },
      { id: "q", label: "Q", parentId: "p" },
    ]);
    expect(countNodes(tree)).toBe(3);
  });

  it("không có nút gốc rõ ràng -> lấy nút đầu tiên; danh sách rỗng -> null", () => {
    expect(buildMindmapTree([{ id: "1", label: "A", parentId: "2" }])?.label).toBe("A");
    expect(buildMindmapTree([])).toBeNull();
    expect(countNodes(null)).toBe(0);
  });
});
