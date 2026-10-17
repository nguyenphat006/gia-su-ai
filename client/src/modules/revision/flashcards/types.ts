import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu sinh từ OpenAPI (serializer backend) — chạy `npm run gen:api` khi backend đổi. */
export type FlashcardDeckItem = Schemas["FlashcardDeck"];
export type FlashcardDeckCreateInput = Schemas["FlashcardDeckCreateUpdateRequest"];
export type FlashcardDeckUpdateInput = FlashcardDeckCreateInput;
export type FlashcardDraft = Schemas["FlashcardDraft"];
export type AiDraftInput = Schemas["AiDraftRequestRequest"];

/** Một thẻ (`cards` của API là JSON tự do; backend chuẩn hóa về {front, back}) */
export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardDeckFilters {
  search?: string;
  is_active?: boolean;
  grade?: number;
  origin?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}
