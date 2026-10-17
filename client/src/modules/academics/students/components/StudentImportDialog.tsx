"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/controls/Combobox";
import { FileDropzone } from "@/components/controls/FileDropzone";
import { useEntityOptions } from "@/components/controls/useEntityOptions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { schoolClassSource } from "../../shared/entitySources";
import { gradeOptions } from "../../shared/grades";
import { useImportStudentsMutation } from "../hooks/useStudentsQuery";
import type { StudentImportResult } from "../types";
import { StudentImportResultPanel } from "./StudentImportResultPanel";
import { downloadStudentTemplate } from "./studentImportUtils";

interface StudentImportDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Nhập học sinh: gửi file .xlsx (multipart) lên `/students/import-excel/`, hiện kết quả + mật khẩu ban đầu. */
export function StudentImportDialog({ open, onClose }: StudentImportDialogProps) {
  const t = useTranslations("students");
  const ta = useTranslations("academics");
  const tc = useTranslations("common");
  const importMutation = useImportStudentsMutation();
  const classOptions = useEntityOptions(schoolClassSource);
  const grades = useMemo(() => gradeOptions(ta), [ta]);

  const [file, setFile] = useState<File | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [schoolClass, setSchoolClass] = useState<string | null>(null);
  const [result, setResult] = useState<StudentImportResult | null>(null);

  const reset = () => {
    setFile(null);
    setGrade(null);
    setSchoolClass(null);
    setResult(null);
  };

  const close = () => {
    if (importMutation.isPending) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!file) {
      toast.error(t("import.fileRequired"));
      return;
    }
    try {
      const res = await importMutation.mutateAsync({ file, grade: grade ? Number(grade) : null, school_class: schoolClass ? Number(schoolClass) : null });
      setResult(res);
      if (res.errors.length) toast.warning(t("import.errorsTitle", { count: res.errors.length }));
      else toast.success(t("import.imported", { count: res.count }));
    } catch (error) {
      toast.error(extractErrorMessage(error, tc("messages.saveError")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="flex max-h-[calc(100vh-80px)] flex-col gap-0 p-0 sm:max-w-[760px]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{t("import.title")}</DialogTitle>
          <DialogDescription>{t("import.description")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {result ? (
            <StudentImportResultPanel result={result} />
          ) : (
            <>
              {file ? (
                <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <FileSpreadsheet className="size-5 text-[var(--c-success)]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label={tc("actions.remove")} onClick={() => setFile(null)} disabled={importMutation.isPending}>
                    <X />
                  </Button>
                </div>
              ) : (
                <FileDropzone accept=".xlsx,.xls" onFiles={(files) => setFile(files[0] ?? null)} title={t("import.dropTitle")} hint={t("import.dropHint")} />
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="import-grade">{t("import.defaultGrade")}</Label>
                  <Combobox id="import-grade" options={grades} value={grade} onChange={setGrade} allowClear placeholder={t("import.selectPlaceholder")} />
                  <p className="text-xs text-muted-foreground">{t("import.defaultGradeHint")}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="import-class">{t("import.defaultClass")}</Label>
                  <Combobox
                    id="import-class"
                    options={classOptions.options}
                    value={schoolClass}
                    onChange={setSchoolClass}
                    allowClear
                    placeholder={t("import.selectPlaceholder")}
                    onSearch={classOptions.onSearch}
                    onReachEnd={classOptions.onReachEnd}
                    onOpenChange={classOptions.onOpenChange}
                    loading={classOptions.loading}
                    hasMore={classOptions.hasMore}
                  />
                  <p className="text-xs text-muted-foreground">{t("import.defaultClassHint")}</p>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="border-t px-6 py-3">
          {result ? (
            <>
              <Button type="button" variant="outline" onClick={reset}>
                {t("import.importAnother")}
              </Button>
              <Button type="button" onClick={close}>
                {tc("actions.close")}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" className="sm:mr-auto" onClick={() => downloadStudentTemplate(t("import.templateFile"))}>
                <Download />
                {t("import.downloadTemplate")}
              </Button>
              <Button type="button" variant="outline" onClick={close} disabled={importMutation.isPending}>
                {tc("actions.cancel")}
              </Button>
              <Button type="button" onClick={submit} disabled={!file || importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="animate-spin" />}
                {t("import.submit")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
