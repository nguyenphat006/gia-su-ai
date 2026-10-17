import { http } from "@/lib/api/axiosClient";
import type { Paginated } from "@/lib/api/types";
import { AI_TIMEOUT } from "../shared/learn.service";
import type { ChatMessage, ChatSession, SendMessageResult } from "../shared/types";

const BASE = "/learn/chat/sessions/";

export const chatService = {
  listSessions: (page: number, pageSize = 20) => http.get<Paginated<ChatSession>>(BASE, { params: { page, page_size: pageSize } }),
  createSession: () => http.post<ChatSession>(BASE, {}),
  renameSession: (id: number, title: string) => http.patch<ChatSession>(`${BASE}${id}/`, { title }),
  deleteSession: (id: number) => http.delete(`${BASE}${id}/`),
  /** Server trả mảng tin nhắn gần nhất (cũ -> mới) — schema OpenAPI ghi nhầm là phân trang */
  listMessages: (id: number) => http.get<ChatMessage[]>(`${BASE}${id}/messages/`),
  sendMessage: (id: number, content: string, image?: File | null) => {
    if (image) {
      const form = new FormData();
      form.append("content", content);
      form.append("image", image);
      return http.post<SendMessageResult>(`${BASE}${id}/messages/`, form, {
        timeout: AI_TIMEOUT,
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return http.post<SendMessageResult>(`${BASE}${id}/messages/`, { content }, { timeout: AI_TIMEOUT });
  },
};
