import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SchoolClassesView from "@/modules/academics/classes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schoolClasses");
  return { title: t("pageTitle") };
}

export default function SchoolClassesPage() {
  return <SchoolClassesView />;
}
