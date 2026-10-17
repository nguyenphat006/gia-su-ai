/** Hàm thuần cho trình sửa sơ đồ tư duy: nút phẳng {id, label, parentId} — đúng 1 gốc (nút đầu tiên). */

export interface MindmapNode {
  id: string;
  label: string;
  parentId: string | null;
}

export interface TreeRow {
  id: string;
  label: string;
  depth: number;
}

/** Id ngắn không trùng các id đã có (vd. "n4k9x2") */
export function newNodeId(existing: Iterable<string>, random: () => number = Math.random): string {
  const taken = new Set(existing);
  for (let attempt = 0; ; attempt++) {
    const base = `n${random().toString(36).slice(2, 7)}`;
    // Hàm random kém (test / trùng liên tiếp) -> thêm hậu tố để chắc chắn kết thúc
    const id = attempt > 20 ? `${base}${attempt}` : base;
    if (id.length > 1 && !taken.has(id)) return id;
  }
}

function childrenIndex(nodes: MindmapNode[]): Map<string, MindmapNode[]> {
  const map = new Map<string, MindmapNode[]>();
  for (const n of nodes) {
    if (n.parentId == null) continue;
    const list = map.get(n.parentId) ?? [];
    list.push(n);
    map.set(n.parentId, list);
  }
  return map;
}

/** Mọi hậu duệ của nút `id` (không gồm chính nó) */
export function descendantIds(nodes: MindmapNode[], id: string): Set<string> {
  const children = childrenIndex(nodes);
  const out = new Set<string>();
  const stack = [...(children.get(id) ?? [])];
  while (stack.length) {
    const n = stack.pop() as MindmapNode;
    if (out.has(n.id)) continue;
    out.add(n.id);
    stack.push(...(children.get(n.id) ?? []));
  }
  return out;
}

/** Nút có thể làm cha của `id`: trừ chính nó và hậu duệ của nó (tránh vòng lặp) */
export function parentCandidates(nodes: MindmapNode[], id: string): MindmapNode[] {
  const blocked = descendantIds(nodes, id);
  return nodes.filter((n) => n.id !== id && !blocked.has(n.id));
}

/** Cây thụt lề (duyệt sâu từ gốc); nút mồ côi / thuộc vòng lặp xếp cuối ở độ sâu 0 */
export function buildTreeRows(nodes: MindmapNode[]): TreeRow[] {
  const children = childrenIndex(nodes);
  const ids = new Set(nodes.map((n) => n.id));
  const rows: TreeRow[] = [];
  const seen = new Set<string>();
  const visit = (n: MindmapNode, depth: number) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    rows.push({ id: n.id, label: n.label, depth });
    for (const c of children.get(n.id) ?? []) visit(c, depth + 1);
  };
  for (const root of nodes.filter((n) => n.parentId == null || !ids.has(n.parentId))) visit(root, 0);
  for (const n of nodes) if (!seen.has(n.id)) visit(n, 0);
  return rows;
}

/** Bỏ một nút: các con của nó chuyển lên cha của nó (không xóa gốc) */
export function removeNode(nodes: MindmapNode[], id: string): MindmapNode[] {
  const target = nodes.find((n) => n.id === id);
  if (!target || target.parentId == null) return nodes;
  return nodes.filter((n) => n.id !== id).map((n) => (n.parentId === id ? { ...n, parentId: target.parentId } : n));
}

/**
 * Dữ liệu từ API / bản nháp AI -> danh sách nút hợp lệ cho form: id chuỗi không trùng, gốc đứng đầu,
 * chỉ một gốc (gốc thừa / cha không tồn tại / vòng lặp -> gắn vào gốc).
 */
export function normalizeNodes(raw: unknown): MindmapNode[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const nodes: MindmapNode[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    let id = r.id == null || r.id === "" ? "" : String(r.id);
    if (!id || used.has(id)) id = newNodeId(used);
    used.add(id);
    const parent = r.parentId ?? r.parent_id ?? null;
    nodes.push({ id, label: r.label == null ? "" : String(r.label), parentId: parent == null || parent === "" ? null : String(parent) });
  }
  if (!nodes.length) return nodes;
  const ids = new Set(nodes.map((n) => n.id));
  const rootIndex = Math.max(0, nodes.findIndex((n) => n.parentId == null || !ids.has(n.parentId)));
  const root: MindmapNode = { ...nodes[rootIndex], parentId: null };
  const rest = nodes
    .filter((_, i) => i !== rootIndex)
    .map((n) => (n.parentId == null || !ids.has(n.parentId) || n.parentId === n.id ? { ...n, parentId: root.id } : n));
  // Vòng lặp còn sót (A -> B -> A không nối tới gốc): gắn các nút đó vào gốc
  const result = [root, ...rest];
  const reachable = new Set([root.id, ...descendantIds(result, root.id)]);
  return result.map((n) => (reachable.has(n.id) ? n : { ...n, parentId: root.id }));
}

/** Payload gửi API: cắt khoảng trắng nhãn, gốc = nút đầu */
export function nodesPayload(nodes: MindmapNode[]): MindmapNode[] {
  return nodes.map((n, i) => ({ id: n.id, label: n.label.trim(), parentId: i === 0 ? null : n.parentId }));
}
