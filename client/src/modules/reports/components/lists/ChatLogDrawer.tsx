"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RelativeTime } from "@/components/list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatLog } from "../../hooks/useReportsQuery";
import { BLOCKED_STATUS } from "../../statusMaps";
import type { ChatLogRow } from "../../types";
import { MarkdownAnswer } from "./MarkdownAnswer";

function ChatBody({ item }: { item: ChatLogRow }) {
  const t = useTranslations("reports");
  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{item.student_name}</span>
        {item.class_name && <span>{item.class_name}</span>}
        <RelativeTime value={item.created_at} />
        {item.is_blocked && <StatusBadge map={BLOCKED_STATUS} value="true" />}
      </div>

      {item.is_blocked && item.block_reason && (
        <div className="rounded-md border border-[var(--c-error)] bg-[var(--c-error-bg)] px-3 py-2 text-sm text-[var(--c-error)]" role="note">
          <span className="font-medium">{t("chat.blockReason")}: </span>
          {item.block_reason}
        </div>
      )}

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">{t("fields.question")}</h3>
        <p className="rounded-md bg-[var(--c-bg-subtle)] p-3 text-sm whitespace-pre-wrap text-foreground">{item.question}</p>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">{t("fields.answer")}</h3>
        {item.answer ? <MarkdownAnswer>{item.answer}</MarkdownAnswer> : <p className="text-sm text-muted-foreground">{t("chat.noAnswer")}</p>}
      </section>
    </div>
  );
}

/** Ngăn chi tiết một lượt hỏi đáp: câu hỏi đầy đủ + câu trả lời (Markdown, công thức) */
export function ChatLogDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const { data, isLoading, isError, refetch } = useChatLog(id);

  return (
    <Sheet open={id !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-[640px]">
        <SheetHeader className="border-b">
          <SheetTitle className="pr-6">{t("chat.detailTitle")}</SheetTitle>
          <SheetDescription className="sr-only">{t("chat.detailTitle")}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pt-4">
          {isLoading ? (
            <div className="space-y-3 px-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : isError || !data ? (
            <div className="space-y-3 px-4 text-sm text-muted-foreground">
              <p>{t("chat.loadError")}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                {tc("actions.retry")}
              </Button>
            </div>
          ) : (
            <ChatBody item={data} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
