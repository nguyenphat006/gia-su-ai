import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import KnowledgeView from "@/modules/knowledge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("knowledge");
  return { title: t("pageTitle") };
}

export default function KnowledgePage() {
  return <KnowledgeView />;
}
