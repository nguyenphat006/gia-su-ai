"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Bot, ShieldAlert, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveApiAsset } from "../../shared/apiUrls";
import { FormattedContent } from "../../shared/FormattedContent";
import type { ChatRole } from "../../shared/types";

export interface BubbleMessage {
  id: number | string;
  role: ChatRole;
  content: string;
  is_blocked?: boolean;
  image_urls?: string[];
  /** Ảnh cục bộ (blob:) khi đang gửi */
  localImage?: string | null;
}

function Images({ urls }: { urls: string[] }) {
  const t = useTranslations("learnChat");
  if (!urls.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {urls.map((u) => {
        const src = resolveApiAsset(u);
        return (
          <a key={u} href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border bg-[var(--c-bg-muted)]">
            {/* Ảnh có chữ ký từ API (khác origin) -> dùng <img> thường */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={t("message.imageAlt")} loading="lazy" className="max-h-48 max-w-[220px] object-cover" />
          </a>
        );
      })}
    </div>
  );
}

/** Một bong bóng tin nhắn: học sinh (phải) · gia sư AI (trái, Markdown + LaTeX) · hệ thống (cảnh báo) */
export function MessageBubble({ message, xpDelta, pending }: { message: BubbleMessage; xpDelta?: number; pending?: boolean }) {
  const t = useTranslations("learnChat");
  const images = message.localImage ? [message.localImage] : (message.image_urls ?? []);

  if (message.role === "SYSTEM") {
    return (
      <div role="alert" className="mx-auto flex max-w-xl items-start gap-2 rounded-lg border border-[var(--c-warning-border)] bg-[var(--c-warning-bg)] px-3 py-2 text-sm text-[var(--c-warning)]">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <FormattedContent content={message.content} className="text-[var(--c-text-2)]" />
          {xpDelta != null && xpDelta < 0 && <p className="mt-1 text-xs font-semibold">{t("message.xpPenalty", { xp: Math.abs(xpDelta) })}</p>}
        </div>
      </div>
    );
  }

  if (message.role === "USER") {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap break-words sm:max-w-[75%]",
            message.is_blocked ? "border border-[var(--c-warning-border)] bg-[var(--c-warning-bg)] text-foreground" : "bg-[var(--c-primary)] text-white",
            pending && "opacity-80",
          )}
        >
          <Images urls={images} />
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--c-success-bg)] text-[var(--c-success)]" aria-hidden>
        <Bot className="size-4" />
      </span>
      <div className="max-w-[calc(100%-2.5rem)] min-w-0 rounded-2xl rounded-tl-md border bg-card px-4 py-2.5 text-foreground sm:max-w-[80%]">
        <Images urls={images} />
        <FormattedContent content={message.content} />
        {xpDelta != null && xpDelta > 0 && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--c-warning-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--c-warning)] animate-in zoom-in-50 fade-in">
            <Zap className="size-3" aria-hidden />
            {t("message.xpGained", { xp: xpDelta })}
          </span>
        )}
      </div>
    </div>
  );
}

/** "Gia sư đang soạn câu trả lời…" */
export function TypingIndicator() {
  const t = useTranslations("learnChat");
  return (
    <div className="flex items-start gap-2" role="status" aria-live="polite">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--c-success-bg)] text-[var(--c-success)]" aria-hidden>
        <Bot className="size-4" />
      </span>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border bg-card px-4 py-3">
        <span className="flex gap-1" aria-hidden>
          {[0, 150, 300].map((d) => (
            <span key={d} className="size-2 animate-bounce rounded-full bg-[var(--c-text-tertiary)]" style={{ animationDelay: `${d}ms` }} />
          ))}
        </span>
        <span className="text-xs text-muted-foreground">{t("typing")}</span>
      </div>
    </div>
  );
}
