"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, MessageSquare, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/feedback/confirm";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { cn } from "@/lib/utils";
import { ErrorBlock, RowsSkeleton } from "../../shared/ui";
import type { ChatSession } from "../../shared/types";
import { useChatSessions, useDeleteSession, useRenameSession } from "../useChatQueries";

/** Danh sách phiên trò chuyện: chọn, tạo mới, đổi tên, xóa */
export function SessionList({ activeId, onSelect, onNew }: { activeId: number | null; onSelect: (id: number | null) => void; onNew: () => void }) {
  const t = useTranslations("learnChat");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const sessions = useChatSessions();
  const rename = useRenameSession();
  const remove = useDeleteSession();
  const [editing, setEditing] = useState<{ id: number; title: string } | null>(null);
  const items = sessions.data?.pages.flatMap((p) => p.results) ?? [];

  const saveRename = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) return setEditing(null);
    try {
      await rename.mutateAsync({ id: editing.id, title });
      setEditing(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, tc("messages.saveError")));
    }
  };

  const askDelete = (s: ChatSession) =>
    confirm({
      title: t("sessions.deleteTitle"),
      description: t("sessions.deleteDescription", { title: s.title || t("sessions.untitled") }),
      confirmText: tc("actions.delete"),
      danger: true,
      onConfirm: async () => {
        try {
          await remove.mutateAsync(s.id);
          toast.success(t("sessions.deleted"));
          if (s.id === activeId) onSelect(null);
        } catch (error) {
          toast.error(extractErrorMessage(error, tc("messages.genericError")));
        }
      },
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-3">
        <Button className="w-full" onClick={onNew}>
          <Plus />
          {t("sessions.new")}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {sessions.isLoading ? (
          <RowsSkeleton rows={6} className="px-1" />
        ) : sessions.isError ? (
          <ErrorBlock onRetry={() => sessions.refetch()} />
        ) : !items.length ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("sessions.empty")}</p>
        ) : (
          <ul className="space-y-1">
            {items.map((s) => {
              const active = s.id === activeId;
              if (editing?.id === s.id) {
                return (
                  <li key={s.id} className="flex items-center gap-1 rounded-lg bg-[var(--c-bg-muted)] p-1">
                    <Input
                      autoFocus
                      value={editing.title}
                      maxLength={255}
                      aria-label={t("sessions.rename")}
                      onChange={(e) => setEditing({ id: s.id, title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="h-8"
                    />
                    <Button size="icon" variant="ghost" className="size-8" onClick={saveRename} disabled={rename.isPending} aria-label={tc("actions.save")}>
                      {rename.isPending ? <Loader2 className="animate-spin" /> : <Check />}
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(null)} aria-label={tc("actions.cancel")}>
                      <X />
                    </Button>
                  </li>
                );
              }
              return (
                <li key={s.id} className={cn("group flex items-center rounded-lg", active ? "bg-[var(--c-primary-bg)]" : "hover:bg-[var(--c-bg-subtle)]")}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn("flex min-h-10 min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm", active ? "font-semibold text-[var(--c-primary)]" : "text-foreground")}
                  >
                    <MessageSquare className="size-4 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">{s.title || t("sessions.untitled")}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="mr-1 size-8 shrink-0 opacity-70 group-hover:opacity-100" aria-label={tc("actions.more")}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing({ id: s.id, title: s.title ?? "" })}>
                        <Pencil />
                        {t("sessions.rename")}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => askDelete(s)}>
                        <Trash2 />
                        {tc("actions.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
        {sessions.hasNextPage && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => sessions.fetchNextPage()} disabled={sessions.isFetchingNextPage}>
            {sessions.isFetchingNextPage && <Loader2 className="animate-spin" />}
            {t("sessions.loadMore")}
          </Button>
        )}
      </div>
    </div>
  );
}
