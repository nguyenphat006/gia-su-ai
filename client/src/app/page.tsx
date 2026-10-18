import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { APP_CONFIG } from "@/config/app";
import { LandingView } from "@/modules/landing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  // Trang "/" cùng cấp layout gốc -> title.template không áp dụng, khai báo tiêu đề đầy đủ
  return { title: { absolute: `${APP_CONFIG.name} — ${t("hero.title")}` }, description: t("hero.subtitle") };
}

export default function HomePage() {
  return <LandingView />;
}
