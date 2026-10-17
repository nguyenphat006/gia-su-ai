import { http } from "@/lib/api/axiosClient";
import { createCrudService } from "@/lib/api/crud";
import { AI_DRAFT_TIMEOUT } from "../../questions/services/question.service";
import type { AiDraftInput, FlashcardDeckCreateInput, FlashcardDeckFilters, FlashcardDeckItem, FlashcardDeckUpdateInput, FlashcardDraft } from "../types";

const RESOURCE = "/flashcard-decks/";

/** CRUD + statistics + batch chuẩn cho `/flashcard-decks/` + AI soạn nháp (không lưu). */
export const flashcardDeckService = {
  ...createCrudService<FlashcardDeckItem, FlashcardDeckCreateInput, FlashcardDeckUpdateInput, FlashcardDeckFilters>(RESOURCE),
  aiDraft: (data: Pick<AiDraftInput, "topic" | "grade">) => http.post<FlashcardDraft>(`${RESOURCE}ai-draft/`, data, { timeout: AI_DRAFT_TIMEOUT }),
};
