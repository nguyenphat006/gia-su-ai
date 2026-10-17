"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bot, History, Plus } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/feedback/Spinner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { ErrorBlock, RowsSkeleton } from "../shared/ui";
import { useLearnProgressRefresh } from "../shared/useLearnQueries";
import type { ChatMessage } from "../shared/types";
import { Composer } from "./components/Composer";
import { MessageBubble, TypingIndicator } from "./components/MessageBubble";
import { SessionList } from "./components/SessionList";
import { useChatMessages, useSendMessage } from "./useChatQueries";

const NO_MESSAGES: ChatMessage[] = [];
const SUGGESTION_KEYS = ["s1", "s2", "s3", "s4"] as const;

interface PendingSend {
  sessionId: number | null;
  content: string;
  imageUrl: string | null;
}

function parseSessionId(raw: string | null): number | null {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : null;
}

function ChatScreen() {
  const t = useTranslations("learnChat");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionId = parseSessionId(searchParams.get("session"));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState<PendingSend | null>(null);
  const [xpByMessage, setXpByMessage] = useState<Record<number, number>>({});
  const [preset, setPreset] = useState<{ text: string; nonce: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const refreshProgress = useLearnProgressRefresh();

  const selectSession = (id: number | null) => {
    setSheetOpen(false);
    router.replace(id ? `${pathname}?session=${id}` : pathname, { scroll: false });
  };

  const messagesQuery = useChatMessages(sessionId);
  const messages = messagesQuery.data ?? NO_MESSAGES;
  const send = useSendMessage((session) => selectSession(session.id));

  const visiblePending = pending && (pending.sessionId === sessionId || pending.sessionId === null) ? pending : null;

  // Cuộn xuống tin nhắn mới nhất (đồng bộ DOM, không setState)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, visiblePending, sessionId]);

  const handleSend = async (content: string, image: File | null): Promise<boolean> => {
    const imageUrl = image ? URL.createObjectURL(image) : null;
    setPending({ sessionId, content, imageUrl });
    try {
      const { result } = await send.mutateAsync({ sessionId, content, image });
      setXpByMessage((prev) => ({ ...prev, [result.ai_message.id]: result.xp_delta }));
      if (result.blocked) toast.warning(t("blockedToast"));
      refreshProgress(result.completed_challenges);
      return true;
    } catch (error) {
      toast.error(extractErrorMessage(error, t("sendError")));
      return false;
    } finally {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setPending(null);
    }
  };

  const startNew = () => selectSession(null);

  const empty = !sessionId && !visiblePending;

  return (
    <div className="-mx-3 -mt-4 -mb-24 flex h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] min-h-[420px] sm:-mx-4 sm:h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] lg:m-0 lg:h-[calc(100dvh-7.5rem)] lg:overflow-hidden lg:rounded-xl lg:border">
      <aside className="hidden w-72 shrink-0 border-r bg-[var(--c-surface)] lg:block">
        <SessionList activeId={sessionId} onSelect={selectSession} onNew={startNew} />
      </aside>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-80 max-w-[85vw] p-0">
          <SheetTitle className="border-b px-4 py-3 text-base">{t("sessions.title")}</SheetTitle>
          <SessionList activeId={sessionId} onSelect={selectSession} onNew={startNew} />
        </SheetContent>
      </Sheet>

      <section className="flex min-w-0 flex-1 flex-col bg-[var(--c-layout)]">
        <header className="flex items-center gap-2 border-b bg-[var(--c-surface)] px-3 py-2 lg:hidden">
          <Button variant="ghost" size="sm" onClick={() => setSheetOpen(true)}>
            <History />
            {t("sessions.title")}
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={startNew}>
            <Plus />
            {t("sessions.new")}
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6" aria-live="polite">
          {empty ? (
            <div className="mx-auto flex max-w-xl flex-col items-center py-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-[var(--c-success-bg)] text-[var(--c-success)]">
                <Bot className="size-7" aria-hidden />
              </span>
              <h1 className="mt-4 text-lg font-semibold text-foreground">{t("welcome.title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("welcome.subtitle")}</p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTION_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPreset({ text: t(`welcome.suggestions.${k}`), nonce: Date.now() })}
                    className="rounded-xl border bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-[var(--c-primary-border)] hover:bg-[var(--c-primary-bg)]"
                  >
                    {t(`welcome.suggestions.${k}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : messagesQuery.isLoading ? (
            <RowsSkeleton rows={5} className="mx-auto max-w-3xl [&>*:nth-child(odd)]:ml-auto [&>*]:h-14 [&>*]:w-2/3" />
          ) : messagesQuery.isError ? (
            <ErrorBlock message={tc("messages.loadError")} onRetry={() => messagesQuery.refetch()} />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {!messages.length && !visiblePending && <p className="py-8 text-center text-sm text-muted-foreground">{t("emptySession")}</p>}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} xpDelta={xpByMessage[m.id]} />
              ))}
              {visiblePending && (
                <>
                  <MessageBubble pending message={{ id: "pending", role: "USER", content: visiblePending.content, localImage: visiblePending.imageUrl }} />
                  <TypingIndicator />
                </>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <Composer onSend={handleSend} busy={send.isPending} preset={preset} />
      </section>
    </div>
  );
}

/** Gia sư AI: danh sách phiên (Sheet trên mobile) + khung trò chuyện. Phiên đang mở ở `?session=<id>`. */
export function ChatView() {
  return (
    <Suspense fallback={<Spinner />}>
      <ChatScreen />
    </Suspense>
  );
}
