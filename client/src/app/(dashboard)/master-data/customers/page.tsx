import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CustomersView from "@/modules/master-data/customers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("customers");
  return { title: t("pageTitle") };
}

export default function CustomersPage() {
  return <CustomersView />;
}
