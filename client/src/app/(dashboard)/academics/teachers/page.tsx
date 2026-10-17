import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import TeachersView from "@/modules/academics/teachers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teachers");
  return { title: t("pageTitle") };
}

export default function TeachersPage() {
  return <TeachersView />;
}
