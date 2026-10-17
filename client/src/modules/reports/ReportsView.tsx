"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader/PageHeader";
import { useListState } from "@/components/list";
import { listReturnKey } from "@/components/list/ListPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModuleHeader } from "@/hooks/useModuleHeader";
import { ScopeBar } from "./components/ScopeBar";
import { ArenaMatchList } from "./components/lists/ArenaMatchList";
import { ChatLogList } from "./components/lists/ChatLogList";
import { QuizAttemptList } from "./components/lists/QuizAttemptList";
import { StudentReportList } from "./components/lists/StudentReportList";
import { OverviewTab } from "./components/overview/OverviewTab";
import { useReportScope } from "./hooks/useReportScope";
import { tabHref } from "./scope";
import type { ReportScopeParams } from "./types";

const TABS = ["overview", "students", "chat", "arena", "quiz"] as const;
type ReportTab = (typeof TABS)[number];
const DEFAULT_TAB: ReportTab = "overview";

/* Mỗi tab tự giữ trạng thái danh sách trên URL; chỉ tab đang mở được render -> chỉ tab đó gọi API */
function StudentsTab({ scope }: { scope: ReportScopeParams }) {
  return <StudentReportList list={useListState()} scope={scope} />;
}
function ChatTab({ scope }: { scope: ReportScopeParams }) {
  return <ChatLogList list={useListState()} base={scope} />;
}
function ArenaTab({ scope }: { scope: ReportScopeParams }) {
  return <ArenaMatchList list={useListState()} base={scope} />;
}
function QuizTab({ scope }: { scope: ReportScopeParams }) {
  return <QuizAttemptList list={useListState()} base={scope} />;
}

/**
 * Báo cáo học tập (/reports) cho giáo viên: phạm vi chung (ngày, khối, lớp) + 5 tab (`?tab=`).
 * Đổi tab giữ phạm vi, bỏ tìm kiếm / bộ lọc của tab cũ. Chữ: messages/<vi|en>/reports.json.
 */
export function ReportsView() {
  const t = useTranslations("reports");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { title, subtitle } = useModuleHeader("REPORT");
  const { params: scope } = useReportScope();
  const param = searchParams.get("tab");
  const tab: ReportTab = TABS.includes(param as ReportTab) ? (param as ReportTab) : DEFAULT_TAB;

  // Nút "Quay lại" của trang chi tiết học sinh trở về đúng tab / bộ lọc đang xem (như ListPage)
  useEffect(() => {
    try {
      const qs = searchParams.toString();
      sessionStorage.setItem(listReturnKey(pathname), qs ? `${pathname}?${qs}` : pathname);
    } catch {
      // sessionStorage bị chặn -> Quay lại dùng URL gốc
    }
  }, [pathname, searchParams]);

  const changeTab = (value: string) => {
    if (value === tab) return;
    router.replace(tabHref(pathname, searchParams.toString(), value, DEFAULT_TAB), { scroll: false });
  };

  return (
    <Tabs value={tab} onValueChange={changeTab} className="list-page gap-4">
      <PageHeader title={title || t("pageTitle")} subtitle={subtitle}>
        <div className="space-y-3">
          <div className="-mx-1 overflow-x-auto px-1">
            <TabsList>
              {TABS.map((key) => (
                <TabsTrigger key={key} value={key}>
                  {t(`tabs.${key}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <ScopeBar />
        </div>
      </PageHeader>
      <TabsContent value="overview">
        <OverviewTab scope={scope} />
      </TabsContent>
      <TabsContent value="students">
        <StudentsTab scope={scope} />
      </TabsContent>
      <TabsContent value="chat">
        <ChatTab scope={scope} />
      </TabsContent>
      <TabsContent value="arena">
        <ArenaTab scope={scope} />
      </TabsContent>
      <TabsContent value="quiz">
        <QuizTab scope={scope} />
      </TabsContent>
    </Tabs>
  );
}

export default ReportsView;
