"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormattedContent } from "../../shared/FormattedContent";
import type { FlashCard } from "../../shared/types";
import { shuffle } from "../flashcardQuiz";

/** Xem thẻ: lật 3D (bấm / Space / Enter), ← → chuyển thẻ */
export function FlashcardViewer({ cards }: { cards: FlashCard[] }) {
  const t = useTranslations("learnPractice");
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const card = cards[order[pos]];

  const go = (delta: number) => {
    setFlipped(false);
    setPos((p) => Math.min(order.length - 1, Math.max(0, p + delta)));
  };

  // Phím tắt: lắng nghe sự kiện bàn phím (setState trong callback sự kiện)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Tab đang ẩn (forceMount) -> bỏ qua phím tắt
      if (!rootRef.current || rootRef.current.offsetParent === null) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowRight") {
        setFlipped(false);
        setPos((p) => Math.min(order.length - 1, p + 1));
      } else if (e.key === "ArrowLeft") {
        setFlipped(false);
        setPos((p) => Math.max(0, p - 1));
      } else if (e.key === " " || e.key === "Enter") {
        if (target?.tagName === "BUTTON") return;
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order.length]);

  if (!card) return null;

  return (
    <div ref={rootRef} className="space-y-4">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? t("flashcard.showFront") : t("flashcard.showBack")}
        className="group block w-full [perspective:1200px] focus-visible:outline-none"
      >
        <div
          className={cn(
            "relative h-64 w-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none sm:h-72",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-auto rounded-2xl border-2 border-[var(--c-primary-border)] bg-card p-6 text-center [backface-visibility:hidden] group-focus-visible:ring-2 group-focus-visible:ring-ring">
            <span className="mb-3 text-xs font-medium tracking-wide text-[var(--c-primary)]">{t("flashcard.front")}</span>
            <FormattedContent content={card.front} className="text-lg font-semibold text-foreground" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-auto rounded-2xl border-2 border-[var(--c-success-border)] bg-[var(--c-success-bg)] p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="mb-3 text-xs font-medium tracking-wide text-[var(--c-success)]">{t("flashcard.back")}</span>
            <FormattedContent content={card.back} className="text-base text-foreground" />
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => go(-1)} disabled={pos === 0} aria-label={t("flashcard.prev")}>
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {pos + 1}/{order.length}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)}>
            <RotateCw />
            <span className="hidden sm:inline">{t("flashcard.flip")}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOrder(shuffle(order));
              setPos(0);
              setFlipped(false);
            }}
          >
            <Shuffle />
            <span className="hidden sm:inline">{t("flashcard.shuffle")}</span>
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={() => go(1)} disabled={pos === order.length - 1} aria-label={t("flashcard.next")}>
          <ChevronRight />
        </Button>
      </div>
      <p className="hidden text-center text-xs text-muted-foreground sm:block">{t("flashcard.keyboardHint")}</p>
    </div>
  );
}
