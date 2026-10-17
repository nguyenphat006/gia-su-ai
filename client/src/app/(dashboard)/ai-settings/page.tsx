import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AiSettingsView from "@/modules/ai-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("aiSettings");
  return { title: t("pageTitle") };
}

export default function AiSettingsPage() {
  return <AiSettingsView />;
}
