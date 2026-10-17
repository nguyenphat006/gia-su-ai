"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Download, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudentImportResult } from "../types";
import { downloadCredentials } from "./studentImportUtils";

/** Kết quả nhập: số học sinh đã nhập, các dòng lỗi, bảng mật khẩu ban đầu (chỉ hiện một lần) + tải .xlsx */
export function StudentImportResultPanel({ result }: { result: StudentImportResult }) {
  const t = useTranslations("students");
  const headers = {
    studentCode: t("import.columns.studentCode"),
    fullName: t("import.columns.fullName"),
    username: t("import.columns.username"),
    initialPassword: t("import.columns.initialPassword"),
  };

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 rounded-md border border-[var(--c-success)] bg-[var(--c-success-bg)] px-3 py-2 text-sm font-medium">
        <CircleCheck className="size-4 text-[var(--c-success)]" aria-hidden />
        {t("import.imported", { count: result.count })}
      </p>

      {result.errors.length > 0 && (
        <div className="rounded-md border border-[var(--c-warning)] bg-[var(--c-warning-bg)] px-3 py-2 text-sm">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4 text-[var(--c-warning)]" aria-hidden />
            {t("import.errorsTitle", { count: result.errors.length })}
          </div>
          <ul className="max-h-32 list-disc space-y-0.5 overflow-y-auto pl-6 text-muted-foreground">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {result.credentials.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t("import.credentialsTitle")}</h3>
            <Button
              type="button"
              size="sm"
              onClick={() => downloadCredentials(result.credentials, headers, t("import.passwordSetInFile"), t("import.credentialsFile"))}
            >
              <Download />
              {t("import.downloadCredentials")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("import.credentialsWarning")}</p>
          <div className="dt-scroll max-h-72 overflow-y-auto">
            <table className="dt w-full">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>{headers.studentCode}</th>
                  <th>{headers.fullName}</th>
                  <th style={{ width: 150 }}>{headers.username}</th>
                  <th style={{ width: 160 }}>{headers.initialPassword}</th>
                </tr>
              </thead>
              <tbody>
                {result.credentials.map((c) => (
                  <tr key={c.username}>
                    <td className="font-mono">{c.student_code}</td>
                    <td>{c.full_name}</td>
                    <td className="font-mono">{c.username}</td>
                    <td className={c.initial_password ? "font-mono font-semibold" : "text-muted-foreground italic"}>
                      {c.initial_password ?? t("import.passwordSetInFile")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
