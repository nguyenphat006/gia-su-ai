"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Copy, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface InitialCredential {
  username: string;
  password: string;
}

interface InitialPasswordDialogProps {
  credential: InitialCredential | null;
  onClose: () => void;
}

/** Sao chép vào clipboard + thông báo kết quả */
export async function copyText(text: string, messages: { ok: string; fail: string }) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(messages.ok);
  } catch {
    toast.error(messages.fail);
  }
}

/** Hiện tên đăng nhập + mật khẩu ban đầu (server tự sinh) ngay sau khi tạo tài khoản — chỉ hiện một lần. */
export function InitialPasswordDialog({ credential, onClose }: InitialPasswordDialogProps) {
  const t = useTranslations("academics");
  const tc = useTranslations("common");
  const copy = (text: string) => copyText(text, { ok: t("credentials.copied"), fail: t("credentials.copyFailed") });

  return (
    <Dialog open={Boolean(credential)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("credentials.title")}</DialogTitle>
          <DialogDescription>{t("credentials.description", { username: credential?.username ?? "" })}</DialogDescription>
        </DialogHeader>
        {credential && (
          <div className="space-y-3">
            <p className="flex gap-2 rounded-md border border-[var(--c-warning)] bg-[var(--c-warning-bg)] px-3 py-2 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--c-warning)]" aria-hidden />
              {t("credentials.warning")}
            </p>
            {[
              { label: t("credentials.username"), value: credential.username },
              { label: t("credentials.password"), value: credential.password },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">{row.label}</div>
                  <div className="truncate font-mono text-base font-semibold">{row.value}</div>
                </div>
                <Button type="button" variant="outline" size="icon" aria-label={tc("actions.copy")} onClick={() => copy(row.value)}>
                  <Copy />
                </Button>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => credential && copy(`${t("credentials.username")}: ${credential.username}\n${t("credentials.password")}: ${credential.password}`)}
          >
            <Copy />
            {t("credentials.copyAll")}
          </Button>
          <Button type="button" onClick={onClose}>
            {tc("actions.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
