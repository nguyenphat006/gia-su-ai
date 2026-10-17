"use client";

import React, { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useController, useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { FileText, X } from "lucide-react";
import { FileDropzone } from "@/components/controls/FileDropzone";
import { ComboboxField, FieldShell, FormDialog, FormSection, SwitchField, TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { gradeOptions } from "@/modules/academics/shared/grades";
import { toGradePayload } from "@/modules/revision/shared/scope";
import { useUploadSourceDocumentMutation } from "../hooks/useSourceDocumentsQuery";
import { ACCEPT_ATTR, formatBytes, validateUploadFile } from "../uploadUtils";

interface UploadFormValues {
  file: File | null;
  title: string;
  grade: string | null;
  topic: string;
  generate_questions: boolean;
}

const EMPTY: UploadFormValues = { file: null, title: "", grade: null, topic: "", generate_questions: true };

function FileField() {
  const t = useTranslations("sourceDocuments");
  const tc = useTranslations("common");
  const { control } = useFormContext<UploadFormValues>();
  const { field, fieldState } = useController({
    control,
    name: "file",
    rules: {
      validate: (file) => {
        if (!file) return t("upload.fileRequired");
        const error = validateUploadFile(file);
        return error ? t(`upload.${error}`) : true;
      },
    },
  });
  const file = field.value;
  return (
    <FieldShell id="f-file" label={t("upload.file")} required error={fieldState.error?.message} className="form-section__full">
      {file ? (
        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
          <FileText className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
          <Button type="button" variant="ghost" size="icon" aria-label={tc("actions.remove")} onClick={() => field.onChange(null)}>
            <X />
          </Button>
        </div>
      ) : (
        <FileDropzone accept={ACCEPT_ATTR} onFiles={(files) => field.onChange(files[0] ?? null)} title={t("upload.dropTitle")} hint={t("upload.dropHint")} />
      )}
    </FieldShell>
  );
}

interface SourceDocumentUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Tải tài liệu (PDF / DOCX / TXT ≤ 50MB) -> backend trả ngay bản ghi PROCESSING, xử lý nền; danh sách tự làm mới. */
export function SourceDocumentUploadDialog({ open, onClose }: SourceDocumentUploadDialogProps) {
  const t = useTranslations("sourceDocuments");
  const tr = useTranslations("revision");
  const ta = useTranslations("academics");
  const tv = useTranslations("validation");
  const form = useForm<UploadFormValues>({ defaultValues: EMPTY });
  const upload = useUploadSourceDocumentMutation();
  const grades = useMemo(() => gradeOptions(ta), [ta]);

  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      size="md"
      title={t("upload.title")}
      description={t("upload.description")}
      form={form}
      submitText={t("upload.submit")}
      onSubmit={async (values) => {
        if (!values.file) return;
        await upload.mutateAsync({
          file: values.file,
          title: values.title.trim() || undefined,
          grade: toGradePayload(values.grade),
          topic: values.topic.trim() || undefined,
          generate_questions: values.generate_questions,
        });
        toast.success(t("upload.uploaded"));
        onClose();
      }}
    >
      <FormSection>
        <FileField />
        <TextField<UploadFormValues>
          name="title"
          label={t("fields.title")}
          hint={t("upload.titleHint")}
          className="form-section__full"
          rules={{ maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
        />
        <ComboboxField<UploadFormValues> name="grade" label={tr("fields.grade")} options={grades} allowClear placeholder={tr("sharedGrade")} hint={tr("form.gradeHint")} />
        <TextField<UploadFormValues> name="topic" label={tr("fields.topic")} placeholder={tr("form.topicPlaceholder")} rules={{ maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }} />
        <SwitchField<UploadFormValues> name="generate_questions" label={t("fields.generateQuestions")} hint={t("upload.generateHint")} className="form-section__full" />
      </FormSection>
    </FormDialog>
  );
}
