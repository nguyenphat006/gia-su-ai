"use client";

import confetti from "canvas-confetti";

/** Pháo giấy chúc mừng (tôn trọng "giảm chuyển động" của hệ điều hành) */
export function fireConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  // Màu SVG/canvas cố định theo bảng màu thương hiệu (navy / emerald / amber)
  const colors = ["#1E40AF", "#059669", "#D97706", "#0284C7"];
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors, disableForReducedMotion: true });
  window.setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.5 }, colors, disableForReducedMotion: true }), 250);
}
