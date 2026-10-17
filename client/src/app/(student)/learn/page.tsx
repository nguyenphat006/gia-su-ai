import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeView } from "@/modules/student/home";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("learn");
  return { title: t("pageTitle") };
}

export default function Page() {
  return <HomeView />;
}
