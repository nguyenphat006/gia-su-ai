import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LandingView } from "@/modules/landing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return { title: t("pageTitle"), description: t("hero.subtitle") };
}

export default function HomePage() {
  return <LandingView />;
}
