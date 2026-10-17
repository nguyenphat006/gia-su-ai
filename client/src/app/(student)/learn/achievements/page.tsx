import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AchievementsView } from "@/modules/student/achievements";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("learnAchievements");
  return { title: t("pageTitle") };
}

export default function Page() {
  return <AchievementsView />;
}
