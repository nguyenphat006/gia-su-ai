"use client";

import React, { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Network } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { Panel } from "../../shared/ui";
import type { Grade } from "../../shared/types";
import { buildMindmapTree, countNodes } from "../mindmapTree";
import { practiceService } from "../practice.service";
import { MindmapTree } from "./MindmapTree";
import { TopicGradeForm } from "./TopicGradeForm";

/** Tab "Sơ đồ tư duy": chọn chủ đề -> cây kiến thức thu gọn được */
export function MindmapTab() {
  const t = useTranslations("learnPractice");
  const load = useMutation({
    mutationFn: ({ grade, topic }: { grade: Grade | null; topic: string }) => practiceService.getMindmap(grade, topic),
    onError: (error) => toast.error(extractErrorMessage(error, t("mindmap.loadError"))),
  });
  const tree = useMemo(() => (load.data ? buildMindmapTree(load.data.nodes ?? []) : null), [load.data]);

  return (
    <div className="space-y-4">
      <Panel title={t("mindmap.setupTitle")} icon={<Network />}>
        <TopicGradeForm
          loading={load.isPending}
          submitLabel={t("mindmap.load")}
          loadingLabel={t("mindmap.loading")}
          onSubmit={(grade, topic) => load.mutate({ grade, topic })}
        />
      </Panel>
      {load.isPending ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : load.data ? (
        <Panel title={load.data.title} action={<span className="text-xs text-muted-foreground">{t("mindmap.nodeCount", { count: countNodes(tree) })}</span>}>
          {tree ? <MindmapTree key={load.data.id} tree={tree} /> : <EmptyState title={t("mindmap.empty")} />}
        </Panel>
      ) : null}
    </div>
  );
}
