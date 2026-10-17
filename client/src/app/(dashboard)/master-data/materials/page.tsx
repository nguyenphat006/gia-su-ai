import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MaterialsView } from "@/modules/master-data/materials";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("materials");
  return { title: t("pageTitle") };
}

export default function MasterDataMaterialsPage() {
  return <MaterialsView />;
}
