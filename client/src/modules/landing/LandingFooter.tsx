"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUp, Languages } from "lucide-react";
import { BrandMark } from "@/components/layouts/BrandMark";
import type { AppBranding } from "@/hooks/useSystemSettings";
import { useChangeLocale } from "@/i18n/useChangeLocale";
import { ADMIN_HOME } from "@/modules/student/shared/portalAccess";
import { Icon3D } from "./Icon3D";

type FooterLink = { href: string; label: string };

/** Chân trang: thương hiệu + giới thiệu ngắn, liên kết theo nhóm, bản quyền, đổi ngôn ngữ, lên đầu trang */
export function LandingFooter({ branding }: { branding: AppBranding }) {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const { locale, changeLocale, pending } = useChangeLocale();

  const groups: { title: string; links: FooterLink[] }[] = [
    {
      title: t("footer.explore"),
      links: [
        { href: "#features", label: t("nav.features") },
        { href: "#teachers", label: t("nav.teachers") },
        { href: "#start", label: t("footer.start") },
      ],
    },
    {
      title: t("footer.students"),
      links: [
        { href: "/learn/chat", label: t("features.tutor.title") },
        { href: "/learn/practice", label: t("features.practice.title") },
        { href: "/learn/arena", label: t("features.arena.title") },
        { href: "/learn/achievements", label: t("features.achievements.title") },
      ],
    },
    {
      title: t("footer.teachers"),
      links: [
        { href: "/login", label: t("teachers.cta") },
        { href: ADMIN_HOME, label: t("cta.goAdmin") },
      ],
    },
  ];

  const linkClass = "rounded-sm text-sm text-sky-100/80 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none";

  return (
    <footer className="relative overflow-hidden text-white" style={{ background: "var(--c-landing-footer)" }}>
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pt-14 pb-10 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:pt-16">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
            <BrandMark logoUrl={branding.logoUrl} name={branding.name} size={40} />
            <span className="leading-tight">
              <span className="landing-display block text-lg font-bold">{branding.name}</span>
              {branding.owner ? <span className="block text-xs text-sky-100/70">{branding.owner}</span> : null}
            </span>
          </Link>
          <p className="mt-4 text-sm leading-6 text-sky-100/80">{t("footer.about")}</p>
          {/* Ba phân môn KHTN */}
          <div className="mt-5 flex items-center gap-3" aria-hidden>
            <Icon3D name="atomSymbol" size={36} />
            <Icon3D name="testTube" size={36} />
            <Icon3D name="dna" size={36} />
            <Icon3D name="microscope" size={36} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-sm font-semibold">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("#") ? (
                      <a href={link.href} className={linkClass}>
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-sky-100/70 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {branding.owner || branding.name}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => changeLocale(locale === "vi" ? "en" : "vi")}
              className="flex h-9 items-center gap-2 rounded-full border border-white/20 px-3 text-sky-50 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-60"
              aria-label={t("nav.language")}
            >
              <Languages className="size-4" aria-hidden />
              {locale === "vi" ? tc("language.en") : tc("language.vi")}
            </button>
            <a
              href="#top"
              className="flex h-9 items-center gap-2 rounded-full border border-white/20 px-3 text-sky-50 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <ArrowUp className="size-4" aria-hidden />
              {t("footer.backToTop")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
