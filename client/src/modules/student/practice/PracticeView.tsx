"use client";

import React, { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ClipboardList, History, Layers, Network } from "lucide-react";
import { Spinner } from "@/components/feedback/Spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlashcardTab } from "./components/FlashcardTab";
import { HistoryTab } from "./components/HistoryTab";
import { MindmapTab } from "./components/MindmapTab";
import { QuizTab } from "./components/QuizTab";

const TABS = [
  { value: "quiz", icon: ClipboardList },
  { value: "flashcard", icon: Layers },
  { value: "mindmap", icon: Network },
  { value: "history", icon: History },
] as const;
type TabValue = (typeof TABS)[number]["value"];

function PracticeScreen() {
  const t = useTranslations("learnPractice");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: TabValue = TABS.some((x) => x.value === raw) ? (raw as TabValue) : "quiz";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => router.replace(v === "quiz" ? pathname : `${pathname}?tab=${v}`, { scroll: false })} className="gap-4">
        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <TabsList className="h-10 w-max">
            {TABS.map(({ value, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5 px-3">
                <Icon className="size-4" aria-hidden />
                {t(`tabs.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {/* Làm bài / flashcard / sơ đồ giữ nguyên trạng thái khi đổi tab (chỉ ẩn); Lịch sử chỉ tải khi mở */}
        <TabsContent value="quiz" forceMount className="data-[state=inactive]:hidden">
          <QuizTab />
        </TabsContent>
        <TabsContent value="flashcard" forceMount className="data-[state=inactive]:hidden">
          <FlashcardTab />
        </TabsContent>
        <TabsContent value="mindmap" forceMount className="data-[state=inactive]:hidden">
          <MindmapTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Ôn tập: Làm bài · Flashcard · Sơ đồ tư duy · Lịch sử (tab đang mở ở `?tab=`) */
export function PracticeView() {
  return (
    <Suspense fallback={<Spinner />}>
      <PracticeScreen />
    </Suspense>
  );
}
