import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import StudentsView from "@/modules/academics/students";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("students");
  return { title: t("pageTitle") };
}

export default function StudentsPage() {
  return <StudentsView />;
}
