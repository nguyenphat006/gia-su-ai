import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentReportDetailView } from "@/modules/reports";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("detailPageTitle") };
}

export default async function StudentReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentReportDetailView studentId={parseInt(id, 10)} />;
}
