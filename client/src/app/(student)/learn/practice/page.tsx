import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PracticeView } from "@/modules/student/practice";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("learnPractice");
  return { title: t("pageTitle") };
}

export default function Page() {
  return <PracticeView />;
}
