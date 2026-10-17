"use client";

import React, { useEffect, useEffectEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Đồng hồ đếm ngược mỗi câu. Đổi câu -> đổi `key` để đếm lại từ đầu.
 * `running = false` (đã trả lời) -> dừng đồng hồ. Hết giờ -> `onExpire` (gửi đáp án rỗng).
 */
export function QuestionTimer({ seconds, running, onExpire }: { seconds: number; running: boolean; onExpire: () => void }) {
  const t = useTranslations("learnArena");
  const [left, setLeft] = useState(seconds);
  const expire = useEffectEvent(() => onExpire());

  useEffect(() => {
    if (!running) return;
    const deadline = Date.now() + left * 1000;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(id);
        expire();
      }
    }, 250);
    return () => window.clearInterval(id);
    // Chỉ khởi động lại khi bật / tắt; `left` là mốc bắt đầu tại thời điểm bật
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const ratio = seconds ? left / seconds : 0;
  const tone = ratio > 0.5 ? "success" : ratio > 0.2 ? "warning" : "error";
  return (
    <div className="flex items-center gap-2" role="timer" aria-label={t("battle.timeLeft", { seconds: left })}>
      <Timer className="size-4 shrink-0" style={{ color: `var(--c-${tone})` }} aria-hidden />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--c-bg-muted)]">
        <div className="h-full rounded-full transition-[width] duration-300 ease-linear" style={{ width: `${ratio * 100}%`, background: `var(--c-${tone})` }} />
      </div>
      <span className={cn("w-8 shrink-0 text-right text-sm font-semibold tabular-nums", left <= 5 && running && "animate-pulse")} style={{ color: `var(--c-${tone})` }}>
        {t("battle.secondsShort", { seconds: left })}
      </span>
    </div>
  );
}

/** Gọi `onDone` sau `ms` mili-giây (xem đáp án rồi sang câu tiếp). Đổi `key` để chạy lại. */
export function AutoAdvance({ ms, onDone }: { ms: number; onDone: () => void }) {
  const done = useEffectEvent(() => onDone());
  useEffect(() => {
    const id = window.setTimeout(() => done(), ms);
    return () => window.clearTimeout(id);
  }, [ms]);
  return null;
}
