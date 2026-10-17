"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layouts/BrandMark";
import { useChangeLocale } from "@/i18n/useChangeLocale";
import type { AppBranding } from "@/hooks/useSystemSettings";
import type { PrimaryAction } from "./usePrimaryAction";

/** Thanh trên trang chủ: logo trường + tên ứng dụng, mục điều hướng, đổi ngôn ngữ, nút vào hệ thống */
export function LandingHeader({ branding, action }: { branding: AppBranding; action: PrimaryAction }) {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const { locale, changeLocale, pending } = useChangeLocale();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <BrandMark logoUrl={branding.logoUrl} name={branding.name} size={40} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-semibold">{branding.name}</span>
            {branding.owner ? <span className="block truncate text-xs text-muted-foreground">{branding.owner}</span> : null}
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <a href="#features">{t("nav.features")}</a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <a href="#teachers">{t("nav.teachers")}</a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => changeLocale(locale === "vi" ? "en" : "vi")}
            aria-label={t("nav.language")}
          >
            <Languages />
            <span className="hidden sm:inline">{locale === "vi" ? tc("language.en") : tc("language.vi")}</span>
          </Button>
          <Button asChild size="sm">
            <Link href={action.href}>{t(action.labelKey)}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
