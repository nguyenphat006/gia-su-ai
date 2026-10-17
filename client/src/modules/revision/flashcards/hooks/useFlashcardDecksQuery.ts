"use client";

import { useMutation } from "@tanstack/react-query";
import { createCrudHooks } from "@/lib/api/createCrudHooks";
import { flashcardDeckService } from "../services/flashcardDeck.service";

export const FLASHCARD_DECKS_QUERY_KEY = ["flashcard-decks"] as const;

const hooks = createCrudHooks(FLASHCARD_DECKS_QUERY_KEY, flashcardDeckService);

export const flashcardDeckQueryKeys = hooks.keys;
export const useFlashcardDecksList = hooks.useList;
export const useFlashcardDeckDetail = hooks.useDetail;
export const useCreateFlashcardDeckMutation = hooks.useCreate;
export const useUpdateFlashcardDeckMutation = hooks.useUpdate;
export const useDeleteFlashcardDeckMutation = hooks.useDelete;
export const useBatchDeleteFlashcardDecksMutation = hooks.useBatchDelete;
export const useBatchStatusFlashcardDecksMutation = hooks.useBatchStatus;

/** AI soạn nháp bộ thẻ (không ghi CSDL -> không invalidate) */
export function useFlashcardAiDraftMutation() {
  return useMutation({ mutationFn: flashcardDeckService.aiDraft });
}
