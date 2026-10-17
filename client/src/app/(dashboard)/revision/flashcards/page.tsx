import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FlashcardDecksView from "@/modules/revision/flashcards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("flashcardDecks");
  return { title: t("pageTitle") };
}

export default function FlashcardDecksPage() {
  return <FlashcardDecksView />;
}
