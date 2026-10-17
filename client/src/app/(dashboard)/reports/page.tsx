import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ReportsView from "@/modules/reports";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("pageTitle") };
}

export default function ReportsPage() {
  return <ReportsView />;
}
