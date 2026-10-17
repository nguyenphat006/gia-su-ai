import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MaterialDetailView } from "@/modules/master-data/materials";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("materials");
  return { title: t("detailPageTitle") };
}

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MaterialDetailView materialId={parseInt(id, 10)} />;
}
