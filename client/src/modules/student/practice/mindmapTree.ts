/** Hàm thuần dựng cây sơ đồ tư duy từ danh sách nút phẳng {id, label, parentId}. */
import type { MindmapNode } from "../shared/types";

export interface MindmapTreeNode {
  id: string;
  label: string;
  depth: number;
  children: MindmapTreeNode[];
}

/**
 * Gốc = nút `parentId` rỗng đầu tiên (không có thì nút đầu tiên). Nút mồ côi (cha không tồn tại) gắn vào gốc.
 * Bỏ qua id trùng và vòng lặp (mỗi nút chỉ xuất hiện một lần).
 */
export function buildMindmapTree(nodes: readonly MindmapNode[]): MindmapTreeNode | null {
  const valid = nodes.filter((n) => n && n.id != null && String(n.id) !== "");
  if (!valid.length) return null;
  const byId = new Map<string, MindmapNode>();
  for (const n of valid) if (!byId.has(String(n.id))) byId.set(String(n.id), n);

  const root = valid.find((n) => n.parentId == null || n.parentId === "") ?? valid[0];
  const rootId = String(root.id);
  const children = new Map<string, MindmapNode[]>();
  for (const n of byId.values()) {
    const id = String(n.id);
    if (id === rootId) continue;
    const parent = n.parentId != null && byId.has(String(n.parentId)) && String(n.parentId) !== id ? String(n.parentId) : rootId;
    const list = children.get(parent) ?? [];
    list.push(n);
    children.set(parent, list);
  }

  const visited = new Set<string>();
  const build = (n: MindmapNode, depth: number): MindmapTreeNode => {
    const id = String(n.id);
    visited.add(id);
    const kids = (children.get(id) ?? []).filter((c) => !visited.has(String(c.id)));
    // Đánh dấu trước khi đệ quy để anh em không bị lặp
    kids.forEach((c) => visited.add(String(c.id)));
    return { id, label: String(n.label ?? ""), depth, children: kids.map((c) => build(c, depth + 1)) };
  };
  const tree = build(root, 0);

  // Nút thuộc vòng lặp (không tới được từ gốc) -> gắn vào gốc để không mất nội dung
  for (const n of byId.values()) {
    if (!visited.has(String(n.id))) tree.children.push(build(n, 1));
  }
  return tree;
}

/** Tổng số nút trong cây */
export function countNodes(tree: MindmapTreeNode | null): number {
  if (!tree) return 0;
  return 1 + tree.children.reduce((sum, c) => sum + countNodes(c), 0);
}
