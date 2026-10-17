"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { TextField } from "@/components/form";

/** Trường tài khoản đăng nhập dùng chung cho form học sinh / giáo viên */
export interface AccountFormValues {
  username: string;
  full_name: string;
  email: string;
  password: string;
}

interface AccountFieldsProps {
  isEditing: boolean;
  /** Bắt buộc nhập tên đăng nhập khi tạo (giáo viên); học sinh bỏ trống -> dùng mã học sinh */
  usernameRequired?: boolean;
  usernameHint?: string;
}

/** Họ tên · tên đăng nhập (chỉ khi tạo) · email · mật khẩu (tạo: trống = tự sinh; sửa: trống = giữ nguyên) */
export function AccountFields({ isEditing, usernameRequired, usernameHint }: AccountFieldsProps) {
  const t = useTranslations("academics");
  const tv = useTranslations("validation");
  return (
    <>
      <TextField<AccountFormValues>
        name="full_name"
        label={t("fields.fullName")}
        rules={{ required: t("fullNameRequired"), maxLength: { value: 255, message: tv("maxLength", { max: 255 }) } }}
      />
      {!isEditing && (
        <TextField<AccountFormValues>
          name="username"
          label={t("fields.username")}
          hint={usernameHint}
          autoComplete="off"
          inputClassName="font-mono"
          rules={{
            required: usernameRequired ? tv("required", { field: t("fields.username") }) : false,
            pattern: { value: /^[\w.@+-]+$/, message: t("usernameFormat") },
            maxLength: { value: 150, message: tv("maxLength", { max: 150 }) },
          }}
        />
      )}
      <TextField<AccountFormValues>
        name="email"
        label={t("fields.email")}
        type="email"
        autoComplete="off"
        rules={{ pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: tv("email") } }}
      />
      <TextField<AccountFormValues>
        name="password"
        label={t("fields.password")}
        type="password"
        autoComplete="new-password"
        hint={isEditing ? t("passwordKeepHint") : t("passwordCreateHint")}
        rules={{ minLength: { value: 8, message: tv("minLength", { min: 8 }) } }}
      />
    </>
  );
}

/** Bỏ chuỗi rỗng của các trường tùy chọn trước khi gửi (mật khẩu trống = để server tự sinh / giữ nguyên) */
export function accountPayload(values: AccountFormValues, isEditing: boolean) {
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    ...(values.password ? { password: values.password } : {}),
    ...(!isEditing && values.username.trim() ? { username: values.username.trim() } : {}),
  };
}
