"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgeChunksView } from "./chunks/KnowledgeChunksView";
import { SourceDocumentsView } from "./documents/SourceDocumentsView";

const TABS = ["documents", "chunks"] as const;
type KnowledgeTab = (typeof TABS)[number];

/**
 * Trang Tri thức RAG (/knowledge): 2 tab "Tài liệu nguồn" và "Đoạn tri thức".
 * Tab đang mở lưu trên URL (`?tab=chunks`); đổi tab xóa bộ lọc của tab cũ. Mỗi tab chỉ tải dữ liệu khi được mở
 * (Radix chỉ render TabsContent đang chọn).
 */
export function KnowledgeView() {
  const t = useTranslations("knowledge");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get("tab");
  const tab: KnowledgeTab = TABS.includes(param as KnowledgeTab) ? (param as KnowledgeTab) : "documents";

  const changeTab = (value: string) => {
    if (value === tab) return;
    router.replace(value === "documents" ? pathname : `${pathname}?tab=${value}`, { scroll: false });
  };

  const tabsList = (
    <TabsList>
      {TABS.map((key) => (
        <TabsTrigger key={key} value={key}>
          {t(`tabs.${key}`)}
        </TabsTrigger>
      ))}
    </TabsList>
  );

  return (
    <Tabs value={tab} onValueChange={changeTab}>
      <TabsContent value="documents">
        <SourceDocumentsView headerContent={tabsList} />
      </TabsContent>
      <TabsContent value="chunks">
        <KnowledgeChunksView headerContent={tabsList} />
      </TabsContent>
    </Tabs>
  );
}

export default KnowledgeView;
