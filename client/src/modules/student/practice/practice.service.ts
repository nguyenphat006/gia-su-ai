import { http } from "@/lib/api/axiosClient";
import { AI_TIMEOUT } from "../shared/learn.service";
import type {
  CheckAnswerResult,
  FlashcardDeck,
  Grade,
  Mindmap,
  PublicQuestion,
  QuizAttemptHistory,
  QuizResult,
  QuizStartInput,
} from "../shared/types";

const BASE = "/learn/practice/";

export interface AnswerItem {
  question_id: number;
  answer: string;
}

export const practiceService = {
  startQuiz: (input: QuizStartInput) => http.post<PublicQuestion[]>(`${BASE}quiz/start/`, input, { timeout: AI_TIMEOUT }),
  checkAnswer: (questionId: number, answer: string, image?: File | null) => {
    if (image) {
      const form = new FormData();
      form.append("question_id", String(questionId));
      form.append("answer", answer);
      form.append("image", image);
      return http.post<CheckAnswerResult>(`${BASE}quiz/check/`, form, { timeout: AI_TIMEOUT, headers: { "Content-Type": "multipart/form-data" } });
    }
    return http.post<CheckAnswerResult>(`${BASE}quiz/check/`, { question_id: questionId, answer }, { timeout: AI_TIMEOUT });
  },
  submitQuiz: (grade: Grade | null, topic: string, answers: AnswerItem[]) =>
    http.post<QuizResult>(`${BASE}quiz/submit/`, { grade, topic, answers }),
  history: () => http.get<QuizAttemptHistory[]>(`${BASE}quiz/history/`),
  getFlashcards: (grade: Grade | null, topic: string) => http.post<FlashcardDeck>(`${BASE}flashcards/`, { grade, topic }, { timeout: AI_TIMEOUT }),
  submitFlashcards: (deckId: number, answers: { card_index: number; answer: string }[]) =>
    http.post<QuizResult>(`${BASE}flashcards/submit/`, { deck_id: deckId, answers }),
  getMindmap: (grade: Grade | null, topic: string) => http.post<Mindmap>(`${BASE}mindmap/`, { grade, topic }, { timeout: AI_TIMEOUT }),
};
