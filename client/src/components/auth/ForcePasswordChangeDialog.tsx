"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { FormProvider, useForm } from "react-hook-form";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { TextField } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMounted } from "@/hooks/useMounted";
import { extractErrorMessage } from "@/lib/api/errorUtils";
import { applyServerErrors } from "@/lib/api/formErrors";
import { authService } from "@/modules/auth/services/auth.service";
import type { ChangePasswordRequest } from "@/modules/auth/types";
import { useAuthStore } from "@/stores/useAuthStore";

const EMPTY: ChangePasswordRequest = { old_password: "", new_password: "", confirm_password: "" };

interface ForcePasswordChangeDialogProps {
  onLogout: () => void;
}

/**
 * Bắt buộc đổi mật khẩu khi tài khoản dùng mật khẩu được cấp (`must_change_password`): hộp thoại không đóng được,
 * chỉ có Đổi mật khẩu hoặc Đăng xuất. Xong thì tải lại `/auth/me/` để cập nhật cờ.
 */
export function ForcePasswordChangeDialog({ onLogout }: ForcePasswordChangeDialogProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const mounted = useMounted();
  const mustChange = useAuthStore((s) => Boolean(s.user?.must_change_password));
  const updateUser = useAuthStore((s) => s.updateUser);
  const form = useForm<ChangePasswordRequest>({ defaultValues: EMPTY });
  const [submitting, setSubmitting] = useState(false);

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await authService.changePassword(values);
      toast.success(t("changePassword.done"));
      const profile = await authService.getProfile();
      updateUser(profile);
      form.reset(EMPTY);
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(extractErrorMessage(error, tc("messages.saveError")));
    } finally {
      setSubmitting(false);
    }
  });

  // Đọc từ localStorage -> chỉ hiện sau khi mount (tránh lệch hydration)
  const open = mounted && mustChange;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[480px]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" aria-hidden />
            {t("forceChangePassword.title")}
          </DialogTitle>
          <DialogDescription>{t("forceChangePassword.description")}</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={submit} noValidate className="space-y-4">
            <TextField<ChangePasswordRequest>
              name="old_password"
              label={t("forceChangePassword.current")}
              type="password"
              autoComplete="current-password"
              rules={{ required: t("changePassword.currentRequired") }}
            />
            <TextField<ChangePasswordRequest>
              name="new_password"
              label={t("changePassword.new")}
              type="password"
              autoComplete="new-password"
              rules={{ required: t("changePassword.newRequired"), minLength: { value: 8, message: tv("minLength", { min: 8 }) } }}
            />
            <TextField<ChangePasswordRequest>
              name="confirm_password"
              label={t("changePassword.confirm")}
              type="password"
              autoComplete="new-password"
              rules={{ required: t("changePassword.confirmRequired"), validate: (v, all) => v === all.new_password || tv("passwordMismatch") }}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onLogout} disabled={submitting} className="sm:mr-auto">
                <LogOut />
                {tc("actions.logout")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                {t("forceChangePassword.submit")}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export default ForcePasswordChangeDialog;
