import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import MaterialCategoriesView from "@/modules/master-data/material-categories";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("materialCategories");
  return { title: t("pageTitle") };
}

export default function MasterDataMaterialCategoriesPage() {
  return <MaterialCategoriesView />;
}
