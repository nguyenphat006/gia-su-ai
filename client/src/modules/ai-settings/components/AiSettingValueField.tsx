"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useController, useFormContext } from "react-hook-form";
import { FieldShell } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AiSettingValueType } from "../types";

/** Giá trị luôn lưu dạng chuỗi ở backend; ô nhập đổi theo kiểu giá trị. */
export interface AiSettingValueForm {
  value: string;
}

interface AiSettingValueFieldProps {
  valueType: AiSettingValueType;
  hint?: string | null;
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/;

/** PROMPT -> textarea monospace lớn · NUMBER -> ô số · BOOLEAN -> công tắc gửi "true"/"false" · TEXT -> ô chữ */
export function AiSettingValueField({ valueType, hint }: AiSettingValueFieldProps) {
  const t = useTranslations("aiSettings");
  const { control } = useFormContext<AiSettingValueForm>();
  const { field, fieldState } = useController({
    name: "value",
    control,
    rules: {
      validate: (v) => {
        if (valueType === "BOOLEAN") return true;
        if (!v.trim()) return t("form.valueRequired");
        if (valueType === "NUMBER" && !NUMBER_RE.test(v.trim())) return t("form.numberInvalid");
        return true;
      },
    },
  });
  const id = "f-value";
  const error = fieldState.error?.message;

  return (
    <FieldShell id={id} label={t("fields.value")} required={valueType !== "BOOLEAN"} hint={hint || undefined} error={error} className="form-section__full">
      {valueType === "PROMPT" ? (
        <Textarea
          id={id}
          rows={14}
          className="min-h-[18rem] font-mono text-[13px] leading-relaxed"
          aria-invalid={Boolean(error)}
          {...field}
        />
      ) : valueType === "BOOLEAN" ? (
        <div className="flex h-9 items-center gap-2">
          <Switch id={id} checked={field.value === "true"} onCheckedChange={(on) => field.onChange(on ? "true" : "false")} />
          <span className="text-sm">{field.value === "true" ? t("form.booleanOn") : t("form.booleanOff")}</span>
        </div>
      ) : (
        <Input
          id={id}
          type={valueType === "NUMBER" ? "number" : "text"}
          step={valueType === "NUMBER" ? "any" : undefined}
          inputMode={valueType === "NUMBER" ? "decimal" : undefined}
          aria-invalid={Boolean(error)}
          {...field}
        />
      )}
    </FieldShell>
  );
}
