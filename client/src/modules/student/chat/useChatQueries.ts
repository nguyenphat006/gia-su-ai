"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LEARN_KEY } from "../shared/useLearnQueries";
import type { ChatMessage, ChatSession } from "../shared/types";
import { chatService } from "./chat.service";

export const CHAT_KEY = [...LEARN_KEY, "chat"] as const;
export const CHAT_SESSIONS_KEY = [...CHAT_KEY, "sessions"] as const;
export const chatMessagesKey = (id: number) => [...CHAT_KEY, "messages", id] as const;

export function useChatSessions() {
  return useInfiniteQuery({
    queryKey: CHAT_SESSIONS_KEY,
    queryFn: ({ pageParam }) => chatService.listSessions(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.current_page < last.total_pages ? last.current_page + 1 : undefined),
    staleTime: 30_000,
  });
}

export function useChatMessages(sessionId: number | null) {
  return useQuery({
    queryKey: chatMessagesKey(sessionId ?? 0),
    queryFn: () => chatService.listMessages(sessionId as number),
    enabled: sessionId != null,
    staleTime: 60_000,
  });
}

export function useRenameSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => chatService.renameSession(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAT_SESSIONS_KEY }),
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => chatService.deleteSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAT_SESSIONS_KEY }),
  });
}

/** Gửi câu hỏi: chưa có phiên thì tạo phiên trước. Thêm tin nhắn vào cache khi xong. */
export function useSendMessage(onSessionCreated: (session: ChatSession) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, content, image }: { sessionId: number | null; content: string; image: File | null }) => {
      let id = sessionId;
      if (id == null) {
        const session = await chatService.createSession();
        id = session.id;
        // Phiên mới chưa có tin nhắn -> gieo cache rỗng, tránh tải lại trong lúc chờ AI
        queryClient.setQueryData<ChatMessage[]>(chatMessagesKey(id), []);
        onSessionCreated(session);
      }
      const result = await chatService.sendMessage(id, content, image);
      return { sessionId: id, result };
    },
    onSuccess: ({ sessionId, result }) => {
      queryClient.setQueryData<ChatMessage[]>(chatMessagesKey(sessionId), (old) => [...(old ?? []), result.user_message, result.ai_message]);
      queryClient.invalidateQueries({ queryKey: CHAT_SESSIONS_KEY });
    },
  });
}
