import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArenaView } from "@/modules/student/arena";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("learnArena");
  return { title: t("pageTitle") };
}

export default function Page() {
  return <ArenaView />;
}
