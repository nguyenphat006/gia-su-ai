"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { FormDialog, FormSection, SwitchField, TextField, TextareaField } from "@/components/form";
import { AiDraftButton } from "../../shared/AiDraftButton";
import { ScopeFields } from "../../shared/ScopeFields";
import { EMPTY_SCOPE, fromGrade, scopePayload, type ScopeFormValues } from "../../shared/scope";
import { useMindmapAiDraftMutation } from "../hooks/useMindmapsQuery";
import { nodesPayload, normalizeNodes, type MindmapNode } from "../mindmapTree";
import type { MindmapCreateInput, MindmapItem } from "../types";
import { MindmapNodesField } from "./MindmapNodesField";

export interface MindmapFormValues extends ScopeFormValues {
  title: string;
  nodes: MindmapNode[];
  description: string;
  is_active: boolean;
}

interface MindmapFormModalProps {
  open: boolean;
  editing: MindmapItem | null;
  onCancel: () => void;
  /** Ném lỗi lại: FormDialog gắn lỗi backend vào từng ô nhập, lỗi khác hiện toast */
  onSubmit: (values: MindmapCreateInput) => Promise<void>;
  /** Có quyền tạo -> được dùng AI soạn nháp (backend yêu cầu MINDMAP_CREATE) */
  canUseAi: boolean;
}

/** Form mới: chỉ có nút gốc (id cố định — các nút thêm sau sinh id ngẫu nhiên không trùng) */
const EMPTY: MindmapFormValues = { ...EMPTY_SCOPE, title: "", nodes: [{ id: "root", label: "", parentId: null }], description: "", is_active: true };

const toValues = (r: MindmapItem): MindmapFormValues => {
  const nodes = normalizeNodes(r.nodes);
  return {
    grade: fromGrade(r.grade),
    school_class: r.school_class,
    topic: r.topic,
    title: r.title,
    nodes: nodes.length ? nodes : EMPTY.nodes,
    description: r.description ?? "",
    is_active: r.is_active,
  };
};

export function MindmapFormModal({ open, editing, onCancel, onSubmit, canUseAi }: MindmapFormModalProps) {
  const t = useTranslations("mindmaps");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const form = useForm<MindmapFormValues>({ defaultValues: EMPTY });
  const aiDraft = useMindmapAiDraftMutation();
  const isEditing = Boolean(editing);
  const schoolClass = useMemo(() => (editing ? { id: editing.school_class, name: editing.school_class_name } : null), [editing]);

  useEffect(() => {
    if (!open) return;
    form.reset(editing ? toValues(editing) : EMPTY);
  }, [open, editing, form]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      size="xl"
      title={isEditing ? t("form.editTitle") : t("form.createTitle")}
      form={form}
      submitText={isEditing ? tc("actions.saveChanges") : t("form.createTitle")}
      footerExtra={
        canUseAi && (
          <AiDraftButton
            pending={aiDraft.isPending}
            getScope={() => form.getValues()}
            hasContent={() => Boolean(form.getValues("title").trim()) || form.getValues("nodes").some((n) => n.label.trim())}
            onMissingScope={() => void form.trigger(["grade", "topic"])}
            request={aiDraft.mutateAsync}
            apply={(draft) => {
              const nodes = normalizeNodes(draft.nodes);
              form.setValue("title", draft.title, { shouldDirty: true });
              form.setValue("nodes", nodes.length ? nodes : EMPTY.nodes, { shouldDirty: true });
            }}
          />
        )
      }
      onSubmit={(values) =>
        onSubmit({
          ...scopePayload(values),
          title: values.title.trim(),
          nodes: nodesPayload(values.nodes),
          description: values.description.trim() || null,
          is_active: values.is_active,
        })
      }
    >
      <FormSection>
        <ScopeFields<MindmapFormValues> schoolClass={schoolClass} />
        <TextField<MindmapFormValues>
          name="title"
          label={t("fields.title")}
          placeholder={t("form.titlePlaceholder")}
          className="form-section__full"
          rules={{ required: tv("required", { field: t("fields.title") }), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <MindmapNodesField />
        <TextareaField<MindmapFormValues> name="description" label={tc("fields.description")} maxLength={500} className="form-section__full" />
        <SwitchField<MindmapFormValues> name="is_active" label={tc("fields.status")} onText={tc("status.active")} offText={tc("status.inactive")} />
      </FormSection>
    </FormDialog>
  );
}
