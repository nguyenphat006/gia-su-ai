import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import MindmapsView from "@/modules/revision/mindmaps";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mindmaps");
  return { title: t("pageTitle") };
}

export default function MindmapsPage() {
  return <MindmapsView />;
}
