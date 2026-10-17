"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useController, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Combobox } from "@/components/controls/Combobox";
import { FieldShell } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildTreeRows, newNodeId, parentCandidates, removeNode, type MindmapNode } from "../mindmapTree";
import type { MindmapFormValues } from "./MindmapFormModal";

const NO_NODES: MindmapNode[] = [];
const INDENT_PX = 18;

/** Kiểm tra trước khi gửi (backend kiểm tra lại: 1 gốc, cha tồn tại, không vòng lặp) */
export function validateNodes(nodes: MindmapNode[], messages: { labels: string; parent: string }): true | string {
  if (nodes.some((n) => !n.label.trim())) return messages.labels;
  if (nodes.slice(1).some((n) => !n.parentId)) return messages.parent;
  return true;
}

/** Trình sửa nút sơ đồ: mỗi dòng nội dung + nút cha (dòng đầu là gốc), kèm cây xem trước thụt lề */
export function MindmapNodesField() {
  const t = useTranslations("mindmaps");
  const { control } = useFormContext<MindmapFormValues>();
  const { field, fieldState } = useController({
    control,
    name: "nodes",
    rules: { validate: (v) => validateNodes(v, { labels: t("form.labelsRequired"), parent: t("form.parentRequired") }) },
  });
  const nodes = field.value ?? NO_NODES;
  const rows = useMemo(() => buildTreeRows(nodes), [nodes]);
  const showErrors = Boolean(fieldState.error);

  const update = (index: number, patch: Partial<MindmapNode>) => field.onChange(nodes.map((n, i) => (i === index ? { ...n, ...patch } : n)));
  const add = () => field.onChange([...nodes, { id: newNodeId(nodes.map((n) => n.id)), label: "", parentId: nodes[0]?.id ?? null }]);
  const optionLabel = (n: MindmapNode) => n.label.trim() || t("form.unnamed");

  return (
    <FieldShell id="f-nodes" label={t("fields.nodes")} required hint={t("form.nodesHint")} error={fieldState.error?.message} className="form-section__full">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          {nodes.map((node, index) => {
            const isRoot = index === 0;
            const options = isRoot ? [] : parentCandidates(nodes, node.id).map((p) => ({ value: p.id, label: optionLabel(p) }));
            return (
              <div key={node.id} className="flex flex-wrap items-start gap-2 rounded-md border p-2 sm:flex-nowrap">
                <Input
                  value={node.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  onBlur={field.onBlur}
                  maxLength={200}
                  placeholder={isRoot ? t("form.rootPlaceholder") : t("form.nodePlaceholder")}
                  aria-label={`${t("fields.label")} ${index + 1}`}
                  aria-invalid={showErrors && !node.label.trim()}
                  className="min-w-0 flex-1 basis-full sm:basis-auto"
                />
                {isRoot ? (
                  <span className="flex h-9 shrink-0 items-center rounded-md bg-muted px-3 text-xs font-semibold text-muted-foreground sm:w-48">{t("form.root")}</span>
                ) : (
                  <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
                    <Combobox
                      options={options}
                      value={node.parentId}
                      onChange={(v) => update(index, { parentId: v })}
                      placeholder={t("form.parentPlaceholder")}
                      aria-label={`${t("fields.parent")} ${index + 1}`}
                      aria-invalid={showErrors && !node.parentId}
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={t("form.removeNode", { index: index + 1 })}
                  disabled={isRoot}
                  onClick={() => field.onChange(removeNode(nodes, node.id))}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus />
            {t("form.addNode")}
          </Button>
        </div>
        <div className="rounded-md border bg-[var(--c-bg-subtle)] p-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("form.preview")}</p>
          {rows.length ? (
            <ul className="space-y-1 text-sm" aria-label={t("form.preview")}>
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-1.5" style={{ paddingLeft: row.depth * INDENT_PX }}>
                  <span aria-hidden className={row.depth === 0 ? "size-2 rounded-full bg-primary" : "size-1.5 rounded-full bg-[var(--c-border-strong)]"} />
                  <span className={row.depth === 0 ? "font-semibold text-foreground" : "text-foreground"}>{row.label.trim() || t("form.unnamed")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("form.previewEmpty")}</p>
          )}
        </div>
      </div>
    </FieldShell>
  );
}
