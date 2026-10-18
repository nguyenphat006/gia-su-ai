"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Camera, Check, Flame, Medal, Mic, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTOS, type Icon3DName } from "./assets";
import { Icon3D } from "./Icon3D";
import type { PrimaryAction } from "./usePrimaryAction";

type Tone = "primary" | "success" | "error" | "warning";

const FEATURES: { key: "tutor" | "practice" | "arena" | "achievements"; icon: Icon3DName; tone: Tone; Mockup: () => ReactNode }[] = [
  { key: "tutor", icon: "robot", tone: "primary", Mockup: TutorMockup },
  { key: "practice", icon: "books", tone: "success", Mockup: PracticeMockup },
  { key: "arena", icon: "crossedSwords", tone: "error", Mockup: ArenaMockup },
  { key: "achievements", icon: "trophy", tone: "warning", Mockup: AchievementsMockup },
];

const TEACHER_POINTS: { key: "knowledge" | "classes" | "reports"; icon: Icon3DName }[] = [
  { key: "knowledge", icon: "openFileFolder" },
  { key: "classes", icon: "school" },
  { key: "reports", icon: "barChart" },
];

const STEPS: { key: "account" | "learn" | "grow"; icon: Icon3DName }[] = [
  { key: "account", icon: "key" },
  { key: "learn", icon: "laptop" },
  { key: "grow", icon: "rocket" },
];

/** Nội dung dưới dải đầu trang: tính năng cho học sinh, công cụ cho giáo viên, cách bắt đầu, lời mời cuối trang */
export function LandingSections({ action }: { action: PrimaryAction }) {
  const t = useTranslations("landing");
  // Chưa đăng nhập -> nút ở khối giáo viên ghi rõ "Giáo viên đăng nhập"; đã đăng nhập -> đúng cổng của mình
  const teacherLabel = action.labelKey === "cta.login" ? t("teachers.cta") : t(action.labelKey);

  return (
    <main>
      <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <SectionTitle title={t("features.title")} subtitle={t("features.subtitle")} center />
        <div className="mt-12 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, icon, tone, Mockup }) => (
            <article key={key} className="clay-card relative flex flex-col">
              {/* Icon 3D nhô lên khỏi mép thẻ */}
              <Icon3D name={icon} size={64} className="absolute -top-6 right-4 z-10 size-14 drop-shadow-lg" />
              <div className="flex h-36 items-center justify-center rounded-t-2xl p-4" style={{ background: `var(--c-${tone}-bg)` }} aria-hidden>
                <Mockup />
              </div>
              <div className="p-5">
                <h3 className="landing-display text-lg font-bold">{t(`features.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t(`features.${key}.description`)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="teachers" className="scroll-mt-20 border-y bg-[var(--c-surface)]">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <TeacherPhoto />
          <div>
            <SectionTitle title={t("teachers.title")} subtitle={t("teachers.subtitle")} />
            {/* Dòng thời gian: nạp tài liệu -> quản lý lớp -> xem báo cáo */}
            <ol className="relative mt-8 space-y-6 before:absolute before:top-7 before:bottom-7 before:left-7 before:w-px before:bg-[var(--c-primary-border)]">
              {TEACHER_POINTS.map(({ key, icon }) => (
                <li key={key} className="relative flex gap-4">
                  <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--c-primary-bg)] ring-4 ring-[var(--c-surface)]">
                    <Icon3D name={icon} size={36} />
                  </span>
                  <div className="pt-1.5">
                    <h3 className="landing-display text-lg font-bold">{t(`teachers.${key}.title`)}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`teachers.${key}.description`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button asChild size="lg" className="clay-pill mt-8 h-12 rounded-full px-6 text-base">
              <Link href={action.href}>
                {teacherLabel}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="start" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <SectionTitle title={t("steps.title")} subtitle={t("steps.subtitle")} center />
        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ key, icon }, index) => (
            <li key={key} className="clay-card flex gap-4 p-5 sm:block sm:p-6">
              <div className="flex shrink-0 items-start justify-between">
                <Icon3D name={icon} size={64} className="size-14 sm:size-16" />
                <span className="landing-display hidden text-5xl leading-none font-extrabold text-[var(--c-primary-border)] sm:block">{index + 1}</span>
              </div>
              <div>
                <h3 className="landing-display text-lg font-bold sm:mt-4">
                  <span className="text-[var(--c-primary)] sm:hidden">{index + 1}. </span>
                  {t(`steps.${key}.title`)}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`steps.${key}.description`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="relative flex flex-col items-center overflow-hidden rounded-3xl px-6 py-14 text-center text-white" style={{ background: "var(--c-learn-band)" }}>
          <Icon3D name="graduationCap" size={96} className="landing-float absolute top-6 left-6 hidden size-20 drop-shadow-xl md:block" />
          <Icon3D name="lightBulb" size={80} className="landing-float absolute right-8 bottom-6 hidden size-16 drop-shadow-xl [animation-delay:-3s] md:block" />
          <h2 className="landing-display relative text-3xl font-bold sm:text-4xl">{t("finalCta.title")}</h2>
          <p className="relative mt-3 max-w-xl leading-7 text-sky-50/90">{t("finalCta.subtitle")}</p>
          <Button asChild size="lg" className="clay-pill relative mt-8 h-12 rounded-full bg-white px-6 text-base text-sky-800 hover:bg-sky-50">
            <Link href={action.href}>
              {t(action.labelKey)}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

/** Ảnh thầy giáo đứng lớp + thẻ "báo cáo lớp" nổi (trang trí) */
function TeacherPhoto() {
  const t = useTranslations("landing");
  return (
    <div className="relative mx-auto w-full max-w-xl pb-8 lg:max-w-none">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl">
        <Image src={PHOTOS.teacherLab} alt={t("teachers.imageAlt")} fill sizes="(min-width: 1024px) 540px, 100vw" placeholder="blur" className="object-cover" />
      </div>
      <div className="clay-card absolute right-3 bottom-0 flex w-56 items-center gap-3 p-3 sm:-right-4" aria-hidden>
        <Icon3D name="barChart" size={44} />
        <div className="flex h-12 flex-1 items-end gap-1.5">
          {["h-1/3", "h-2/3", "h-1/2", "h-full", "h-3/4"].map((h, i) => (
            <span key={i} className={`block flex-1 rounded-t bg-[var(--c-primary)] ${h} ${i === 3 ? "" : "opacity-50"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle, center }: { title: string; subtitle: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h2 className="landing-display text-3xl leading-tight font-bold sm:text-4xl">{title}</h2>
      <p className="mt-3 leading-7 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/* ---------- Mockup giao diện thu nhỏ (tĩnh, chỉ trang trí) ---------- */

/** Thanh giữ chỗ thay cho chữ — mockup không cần dịch */
function Bar({ className }: { className: string }) {
  return <span className={`block h-2 rounded-full ${className}`} />;
}

function TutorMockup() {
  return (
    <div className="w-full max-w-48 space-y-2">
      <div className="ml-auto w-3/4 rounded-xl rounded-br-sm bg-[var(--c-primary)] p-2">
        <Bar className="w-full bg-white/60" />
      </div>
      <div className="w-5/6 space-y-1.5 rounded-xl rounded-bl-sm bg-[var(--c-surface)] p-2 shadow-sm">
        <Bar className="w-full bg-[var(--c-bg-muted)]" />
        <Bar className="w-2/3 bg-[var(--c-bg-muted)]" />
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-[var(--c-surface)] px-2 py-1.5 shadow-sm">
        <Bar className="flex-1 bg-[var(--c-bg-muted)]" />
        <Mic className="size-3.5 text-[var(--c-primary)]" />
        <Camera className="size-3.5 text-[var(--c-primary)]" />
      </div>
    </div>
  );
}

function PracticeMockup() {
  return (
    <div className="w-full max-w-48 space-y-1.5">
      {["A", "B", "C", "D"].map((letter) => {
        const correct = letter === "B";
        return (
          <div
            key={letter}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 shadow-sm ${correct ? "bg-[var(--c-success)] text-white" : "bg-[var(--c-surface)] text-muted-foreground"}`}
          >
            <span className="text-[11px] font-bold">{letter}</span>
            <Bar className={`flex-1 ${correct ? "bg-white/60" : "bg-[var(--c-bg-muted)]"}`} />
            {correct && <Check className="size-3.5" />}
          </div>
        );
      })}
    </div>
  );
}

function ArenaMockup() {
  return (
    <div className="flex w-full max-w-48 items-center justify-between gap-2">
      <ArenaPlayer score="w-4/5" color="var(--c-primary)" />
      <span className="landing-display text-xl font-extrabold text-[var(--c-error)]">VS</span>
      <ArenaPlayer score="w-1/2" color="var(--c-error)" />
    </div>
  );
}

function ArenaPlayer({ score, color }: { score: string; color: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 rounded-xl bg-[var(--c-surface)] p-2 shadow-sm">
      <span className="size-8 rounded-full" style={{ background: color, opacity: 0.85 }} />
      <span className="block h-2 w-full overflow-hidden rounded-full bg-[var(--c-bg-muted)]">
        <span className={`block h-full rounded-full ${score}`} style={{ background: color }} />
      </span>
    </div>
  );
}

function AchievementsMockup() {
  return (
    <div className="w-full max-w-48 space-y-2 rounded-xl bg-[var(--c-surface)] p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <Medal className="size-6 text-[var(--c-warning)]" />
        <span className="flex items-center gap-1 text-xs font-bold text-[var(--c-warning)]">
          <Flame className="size-3.5" />7
        </span>
      </div>
      <span className="block h-2.5 w-full overflow-hidden rounded-full bg-[var(--c-bg-muted)]">
        <span className="block h-full w-[70%] rounded-full bg-[var(--c-warning)]" />
      </span>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex size-6 items-center justify-center rounded-full bg-[var(--c-warning-bg)]">
            <Trophy className="size-3 text-[var(--c-warning)]" />
          </span>
        ))}
      </div>
    </div>
  );
}
