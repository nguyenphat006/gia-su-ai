"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { LandingHeader } from "./LandingHeader";
import { LandingSections } from "./LandingSections";
import { usePrimaryAction } from "./usePrimaryAction";

/** Trang chủ công khai: giới thiệu nền tảng, lối vào đăng nhập / cổng học sinh / trang quản trị */
export function LandingView() {
  const t = useTranslations("landing");
  const branding = useSystemSettings();
  const action = usePrimaryAction();

  return (
    <div className="theme-learn min-h-screen bg-background text-foreground">
      <LandingHeader branding={branding} action={action} />

      {/* Dải đầu trang: màu xanh phẳng, chữ trắng ở cả sáng / tối */}
      <section className="text-white" style={{ background: "var(--c-learn-band)" }}>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-sm font-medium text-sky-100">{t("hero.eyebrow")}</p>
            <h1 className="mt-3 text-3xl leading-tight font-bold sm:text-4xl">{t("hero.title")}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-sky-50/90">{t("hero.subtitle")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-sky-800 hover:bg-sky-50">
                <Link href={action.href}>
                  {t(action.labelKey)}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <a href="#features">{t("hero.secondary")}</a>
              </Button>
            </div>
            {branding.owner ? <p className="mt-6 text-sm text-sky-100">{t("hero.school", { school: branding.owner })}</p> : null}
          </div>
          <ChatExample />
        </div>
      </section>

      <LandingSections />

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            © {new Date().getFullYear()} {branding.owner || branding.name}
          </span>
          <span>{t("footer.poweredBy")}</span>
        </div>
      </footer>
    </div>
  );
}

/** Ví dụ một lượt hỏi gia sư (dữ liệu tĩnh), trình bày như khung chat thật */
function ChatExample() {
  const t = useTranslations("landing");
  return (
    <div className="hidden rounded-lg border border-white/15 bg-white text-slate-800 shadow-lg lg:block" aria-hidden>
      <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-medium">
        <Bot className="size-4 text-sky-600" />
        {t("preview.title")}
      </div>
      <div className="space-y-3 p-4 text-sm leading-6">
        <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-sky-600 px-3.5 py-2 text-white">{t("preview.question")}</p>
        <div className="max-w-[90%] rounded-lg bg-slate-100 px-3.5 py-2.5">
          <p>{t("preview.answer")}</p>
          <p className="mt-2 font-mono text-sky-700">v = s / t</p>
          <p className="mt-2 text-slate-600">{t("preview.units")}</p>
        </div>
      </div>
    </div>
  );
}
