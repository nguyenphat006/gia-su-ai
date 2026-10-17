import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import UnitsView from "@/modules/master-data/units";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("units");
  return { title: t("pageTitle") };
}

export default function MasterDataUnitsPage() {
  return <UnitsView />;
}
