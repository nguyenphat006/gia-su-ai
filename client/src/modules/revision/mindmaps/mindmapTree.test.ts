import { describe, expect, it } from "vitest";
import { buildTreeRows, descendantIds, newNodeId, nodesPayload, normalizeNodes, parentCandidates, removeNode, type MindmapNode } from "./mindmapTree";

const nodes: MindmapNode[] = [
  { id: "root", label: "Quang hợp", parentId: null },
  { id: "a", label: "Điều kiện", parentId: "root" },
  { id: "a1", label: "Ánh sáng", parentId: "a" },
  { id: "a2", label: "Nước", parentId: "a" },
  { id: "b", label: "Sản phẩm", parentId: "root" },
  { id: "a1x", label: "Cường độ", parentId: "a1" },
];

describe("descendantIds / parentCandidates", () => {
  it("lấy đủ hậu duệ nhiều tầng", () => {
    expect([...descendantIds(nodes, "a")].sort()).toEqual(["a1", "a1x", "a2"]);
    expect(descendantIds(nodes, "b").size).toBe(0);
  });

  it("không cho chọn chính nó hoặc hậu duệ làm cha", () => {
    expect(parentCandidates(nodes, "a").map((n) => n.id)).toEqual(["root", "b"]);
  });
});

describe("buildTreeRows", () => {
  it("duyệt sâu từ gốc với độ sâu đúng", () => {
    expect(buildTreeRows(nodes).map((r) => r.depth + ":" + r.id)).toEqual(["0:root", "1:a", "2:a1", "3:a1x", "2:a2", "1:b"]);
  });

  it("không treo khi dữ liệu có vòng lặp", () => {
    const cyclic: MindmapNode[] = [
      { id: "r", label: "R", parentId: null },
      { id: "x", label: "X", parentId: "y" },
      { id: "y", label: "Y", parentId: "x" },
    ];
    expect(buildTreeRows(cyclic)).toHaveLength(3);
  });
});

describe("removeNode", () => {
  it("chuyển con lên cha của nút bị bỏ, không xóa gốc", () => {
    const next = removeNode(nodes, "a");
    expect(next.find((n) => n.id === "a1")?.parentId).toBe("root");
    expect(next).toHaveLength(nodes.length - 1);
    expect(removeNode(nodes, "root")).toBe(nodes);
  });
});

describe("normalizeNodes", () => {
  it("đưa gốc lên đầu, gắn gốc thừa / cha không tồn tại / vòng lặp vào gốc", () => {
    const result = normalizeNodes([
      { id: 1, label: "Con", parentId: 0 },
      { id: 0, label: "Gốc", parentId: null },
      { id: 2, label: "Gốc thừa", parentId: null },
      { id: 3, label: "Lạc", parentId: "zzz" },
      { id: 4, label: "Vòng A", parentId: 5 },
      { id: 5, label: "Vòng B", parentId: 4 },
    ]);
    expect(result[0]).toMatchObject({ id: "0", label: "Gốc", parentId: null });
    expect(result.filter((n) => n.parentId === null)).toHaveLength(1);
    const rows = buildTreeRows(result);
    expect(rows).toHaveLength(6);
    expect(rows.filter((r) => r.depth === 0)).toHaveLength(1);
  });

  it("sinh id mới khi trùng / thiếu", () => {
    const result = normalizeNodes([{ label: "A" }, { id: "x", label: "B", parentId: null }, { id: "x", label: "C" }]);
    expect(new Set(result.map((n) => n.id)).size).toBe(3);
  });

  it("dữ liệu không phải mảng -> rỗng", () => {
    expect(normalizeNodes(null)).toEqual([]);
  });
});

describe("newNodeId / nodesPayload", () => {
  it("id không trùng kể cả khi random lặp lại", () => {
    const first = newNodeId([], () => 0.123456);
    const second = newNodeId([first], () => 0.123456);
    expect(second).not.toBe(first);
  });

  it("cắt khoảng trắng và ép nút đầu là gốc", () => {
    expect(nodesPayload([{ id: "r", label: " R ", parentId: "x" }])).toEqual([{ id: "r", label: "R", parentId: null }]);
  });
});
