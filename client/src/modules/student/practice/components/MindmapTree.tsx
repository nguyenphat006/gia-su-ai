"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormattedContent } from "../../shared/FormattedContent";
import type { MindmapTreeNode } from "../mindmapTree";

/** Màu theo độ sâu (token) */
const DEPTH_TONES = ["primary", "success", "warning", "purple", "info", "error"] as const;
const tone = (depth: number) => DEPTH_TONES[depth % DEPTH_TONES.length];

function collectBranchIds(node: MindmapTreeNode, acc: string[] = []): string[] {
  if (node.children.length) acc.push(node.id);
  node.children.forEach((c) => collectBranchIds(c, acc));
  return acc;
}

function Branch({ node, collapsed, toggle }: { node: MindmapTreeNode; collapsed: Set<string>; toggle: (id: string) => void }) {
  const t = useTranslations("learnPractice");
  const isOpen = !collapsed.has(node.id);
  const color = `var(--c-${tone(node.depth)})`;
  const hasKids = node.children.length > 0;
  return (
    <li className="relative">
      <div className="flex items-start gap-1">
        {hasKids ? (
          <button
            type="button"
            onClick={() => toggle(node.id)}
            aria-expanded={isOpen}
            aria-label={isOpen ? t("mindmap.collapse") : t("mindmap.expand")}
            className="mt-1 flex size-6 shrink-0 items-center justify-center rounded hover:bg-[var(--c-bg-muted)]"
            style={{ color }}
          >
            {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="mt-2.5 ml-2 size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
        )}
        <div className="min-w-0 rounded-md px-2 py-1 text-sm text-foreground" style={{ background: `var(--c-${tone(node.depth)}-bg)` }}>
          <FormattedContent inline content={node.label} />
        </div>
      </div>
      {hasKids && isOpen && (
        <ul className="mt-1 ml-3 space-y-1 border-l-2 pl-3" style={{ borderColor: color }}>
          {node.children.map((c) => (
            <Branch key={c.id} node={c} collapsed={collapsed} toggle={toggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Sơ đồ tư duy: gốc ở giữa phía trên, mỗi nhánh cấp 1 một cột (cuộn ngang trên mobile), nhánh con thu gọn được */
export function MindmapTree({ tree }: { tree: MindmapTreeNode }) {
  const t = useTranslations("learnPractice");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allBranchIds = tree.children.flatMap((c) => collectBranchIds(c));

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(new Set())}>
          <ChevronsUpDown />
          {t("mindmap.expandAll")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(new Set(allBranchIds))}>
          <ChevronsDownUp />
          {t("mindmap.collapseAll")}
        </Button>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="mx-auto flex w-max min-w-full flex-col items-center">
          <div className="max-w-md rounded-lg px-5 py-3 text-center text-base font-semibold text-white shadow-sm" style={{ background: "var(--c-brand-gradient)" }}>
            <FormattedContent inline content={tree.label} />
          </div>
          {tree.children.length > 0 && (
            <>
              <span className="h-5 w-0.5 bg-[var(--c-border-strong)]" aria-hidden />
              <ul className="flex items-start gap-3 border-t-2 border-[var(--c-border-strong)] pt-4">
                {tree.children.map((branch) => {
                  const color = `var(--c-${tone(branch.depth)})`;
                  const isOpen = !collapsed.has(branch.id);
                  return (
                    <li key={branch.id} className="w-60 shrink-0 rounded-xl border-2 bg-card p-3" style={{ borderColor: color }}>
                      <button
                        type="button"
                        onClick={() => branch.children.length && toggle(branch.id)}
                        aria-expanded={branch.children.length ? isOpen : undefined}
                        className="flex w-full items-start gap-2 text-left text-sm font-semibold"
                        style={{ color }}
                      >
                        {branch.children.length > 0 && (isOpen ? <ChevronDown className="mt-0.5 size-4 shrink-0" /> : <ChevronRight className="mt-0.5 size-4 shrink-0" />)}
                        <FormattedContent inline content={branch.label} className={cn("min-w-0 text-foreground")} />
                      </button>
                      {branch.children.length > 0 && isOpen && (
                        <ul className="mt-2 space-y-1">
                          {branch.children.map((c) => (
                            <Branch key={c.id} node={c} collapsed={collapsed} toggle={toggle} />
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
