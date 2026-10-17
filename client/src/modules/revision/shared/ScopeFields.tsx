"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { FieldValues, Path } from "react-hook-form";
import { ComboboxField, EntityComboField, TextField } from "@/components/form";
import { schoolClassSource } from "@/modules/academics/shared/entitySources";
import { gradeOptions } from "@/modules/academics/shared/grades";
import type { Schemas } from "@/types/api";

interface ScopeFieldsProps {
  /** Lớp đang gắn khi sửa (để Combobox hiện tên lớp) */
  schoolClass?: { id: number | null; name: string } | null;
  /** Bắt buộc chọn khối (vd. trước khi nhờ AI soạn) */
  gradeRequired?: boolean;
  /** Bỏ ô lớp riêng (đoạn tri thức không gắn lớp) */
  withClass?: boolean;
}

/** Khối · Lớp (riêng) · Chủ đề — dùng chung cho form câu hỏi, flashcard, sơ đồ tư duy. Form phải có các trường của `ScopeFormValues`. */
export function ScopeFields<T extends FieldValues>({ schoolClass, gradeRequired, withClass = true }: ScopeFieldsProps) {
  const t = useTranslations("revision");
  const ta = useTranslations("academics");
  const tv = useTranslations("validation");
  const grades = useMemo(() => gradeOptions(ta), [ta]);
  const classInitial = useMemo(
    () => (schoolClass?.id ? [{ value: String(schoolClass.id), label: schoolClass.name }] : []),
    [schoolClass],
  );
  return (
    <>
      <ComboboxField<T>
        name={"grade" as Path<T>}
        label={t("fields.grade")}
        options={grades}
        allowClear={!gradeRequired}
        placeholder={gradeRequired ? t("form.selectGrade") : t("sharedGrade")}
        hint={gradeRequired ? undefined : t("form.gradeHint")}
        rules={gradeRequired ? { required: tv("requiredSelect", { field: t("fields.grade") }) } : undefined}
      />
      {withClass && (
        <EntityComboField<T, Schemas["SchoolClass"]>
          name={"school_class" as Path<T>}
          label={t("fields.schoolClass")}
          placeholder={t("form.schoolClassPlaceholder")}
          hint={t("form.schoolClassHint")}
          initialOptions={classInitial}
          allowClear
          {...schoolClassSource}
        />
      )}
      <TextField<T>
        name={"topic" as Path<T>}
        label={t("fields.topic")}
        placeholder={t("form.topicPlaceholder")}
        className="form-section__full"
        rules={{ required: tv("required", { field: t("fields.topic") }), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
      />
    </>
  );
}
