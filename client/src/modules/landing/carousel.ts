/** Chỉ số slide sau khi dịch `delta` bước, quay vòng trong [0, total) */
export function stepIndex(index: number, delta: number, total: number): number {
  if (total <= 0) return 0;
  return (((index + delta) % total) + total) % total;
}

/** Hướng vuốt: kéo đủ xa sang trái -> slide sau (+1), sang phải -> slide trước (-1), còn lại 0 */
export function swipeDelta(startX: number, endX: number, threshold = 40): -1 | 0 | 1 {
  const dx = endX - startX;
  if (Math.abs(dx) < threshold) return 0;
  return dx < 0 ? 1 : -1;
}
