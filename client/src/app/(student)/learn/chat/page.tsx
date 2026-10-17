import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChatView } from "@/modules/student/chat";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("learnChat");
  return { title: t("pageTitle") };
}

export default function Page() {
  return <ChatView />;
}
