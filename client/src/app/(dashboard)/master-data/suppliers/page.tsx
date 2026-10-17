import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SuppliersView from "@/modules/master-data/suppliers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("suppliers");
  return { title: t("pageTitle") };
}

export default function SuppliersPage() {
  return <SuppliersView />;
}
