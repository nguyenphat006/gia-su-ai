"use client";

import { useTranslations } from "next-intl";
import { BarChart3, BookOpenCheck, Bot, FileUp, Swords, Trophy, Users, type LucideIcon } from "lucide-react";

const FEATURES: { key: "tutor" | "practice" | "arena" | "achievements"; icon: LucideIcon }[] = [
  { key: "tutor", icon: Bot },
  { key: "practice", icon: BookOpenCheck },
  { key: "arena", icon: Swords },
  { key: "achievements", icon: Trophy },
];

const TEACHER_POINTS: { key: "knowledge" | "classes" | "reports"; icon: LucideIcon }[] = [
  { key: "knowledge", icon: FileUp },
  { key: "classes", icon: Users },
  { key: "reports", icon: BarChart3 },
];

const STEPS = ["account", "learn", "grow"] as const;

/** Nội dung dưới dải đầu trang: tính năng cho học sinh, công cụ cho giáo viên, cách bắt đầu */
export function LandingSections() {
  const t = useTranslations("landing");

  return (
    <main>
      <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 lg:py-16">
        <SectionTitle title={t("features.title")} subtitle={t("features.subtitle")} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, icon: Icon }) => (
            <article key={key} className="rounded-lg border bg-card p-5">
              <Icon className="size-6 text-[var(--c-primary)]" />
              <h3 className="mt-3 font-semibold">{t(`features.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t(`features.${key}.description`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="teachers" className="scroll-mt-20 border-y bg-[var(--c-bg-subtle)]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:py-16">
          <SectionTitle title={t("teachers.title")} subtitle={t("teachers.subtitle")} />
          <ul className="divide-y rounded-lg border bg-card">
            {TEACHER_POINTS.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-4 p-4">
                <Icon className="mt-0.5 size-5 shrink-0 text-[var(--c-primary)]" />
                <div>
                  <h3 className="font-semibold">{t(`teachers.${key}.title`)}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`teachers.${key}.description`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <SectionTitle title={t("steps.title")} subtitle={t("steps.subtitle")} />
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((key, index) => (
            <li key={key} className="flex gap-4 rounded-lg border bg-card p-5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--c-primary)] text-sm font-semibold text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{t(`steps.${key}.title`)}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`steps.${key}.description`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 leading-7 text-muted-foreground">{subtitle}</p>
    </div>
  );
}
