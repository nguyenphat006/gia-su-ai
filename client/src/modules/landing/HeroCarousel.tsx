"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Pause, Play, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { PHOTOS, type Icon3DName } from "./assets";
import { stepIndex, swipeDelta } from "./carousel";
import { Icon3D } from "./Icon3D";
import type { PrimaryAction } from "./usePrimaryAction";

type SlideKey = "tutor" | "practice" | "arena";

// cardSide: thẻ minh họa đặt bên nào để không che người trong ảnh; photoClass: căn khung ảnh
const SLIDES: {
  key: SlideKey;
  photo: StaticImageData;
  photoClass?: string;
  badge: Icon3DName;
  cardSide: "left" | "right";
  Card: () => ReactNode;
}[] = [
  { key: "tutor", photo: PHOTOS.tutorStudy, badge: "robot", cardSide: "left", Card: TutorCard },
  { key: "practice", photo: PHOTOS.practiceMicroscope, photoClass: "object-[50%_30%]", badge: "books", cardSide: "left", Card: QuizCard },
  { key: "arena", photo: PHOTOS.arenaRaisedHands, badge: "crossedSwords", cardSide: "left", Card: DuelCard },
];

/** Thời gian mỗi slide (ms) */
const INTERVAL = 6000;

/**
 * Dải đầu trang dạng slider: chữ đổi mờ dần, ảnh trượt ngang, thẻ minh họa theo từng slide.
 * Tự chạy; dừng khi rê chuột, khi dùng bàn phím trong slider, khi bấm "Tạm dừng" hoặc người dùng bật giảm chuyển động.
 */
export function HeroCarousel({ action, school }: { action: PrimaryAction; school: string }) {
  const t = useTranslations("landing");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const total = SLIDES.length;
  const autoplay = !paused && !reduceMotion && !hovered && !keyboardFocus;

  // Đổi slide (tự động hay bấm tay) -> đếm lại từ đầu
  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => setIndex((i) => stepIndex(i, 1, total)), INTERVAL);
    return () => window.clearTimeout(id);
  }, [autoplay, index, total]);

  const go = (delta: number) => setIndex((i) => stepIndex(i, delta, total));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
  };
  // Chỉ dừng khi focus bằng bàn phím (bấm chuột vào nút điều khiển vẫn để slider chạy tiếp)
  const onFocus = (e: FocusEvent) => setKeyboardFocus(e.target instanceof HTMLElement && e.target.matches(":focus-visible"));
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeyboardFocus(false);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("hero.carousel.label")}
      className="relative overflow-hidden text-white"
      style={{ background: "var(--c-learn-band)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <h1 className="sr-only">{t("hero.title")}</h1>
      {/* Vệt sáng nền */}
      <div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-sky-300/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-48 -left-32 size-[420px] rounded-full bg-cyan-300/10 blur-3xl" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pt-16 lg:pb-24">
        <div>
          {/* Các slide chữ chồng trong cùng một ô lưới -> chiều cao cố định, không giật bố cục khi đổi */}
          <div className="grid" aria-live={autoplay ? "off" : "polite"}>
            {SLIDES.map((slide, i) => {
              const active = i === index;
              return (
                <div
                  key={slide.key}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={t("hero.carousel.slideLabel", { index: i + 1, total })}
                  aria-hidden={!active}
                  inert={!active}
                  className={cn(
                    "[grid-area:1/1] transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
                    active ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0",
                  )}
                >
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/15 py-1 pr-3 pl-1.5 text-sm font-medium text-sky-50">
                    <Icon3D name={slide.badge} size={24} />
                    {t(`hero.slides.${slide.key}.eyebrow`)}
                  </p>
                  <h2 className="landing-display mt-4 text-4xl leading-[1.1] font-bold sm:text-5xl">{t(`hero.slides.${slide.key}.title`)}</h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-sky-50/90 sm:text-lg sm:leading-8">{t(`hero.slides.${slide.key}.subtitle`)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="clay-pill h-12 rounded-full bg-white px-6 text-base text-sky-800 hover:bg-sky-50">
              <Link href={action.href}>
                {t(action.labelKey)}
                <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/60 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white dark:border-white/60 dark:bg-transparent dark:hover:bg-white/10"
            >
              <a href="#features">
                <Sparkles />
                {t("hero.secondary")}
              </a>
            </Button>
          </div>

          <CarouselControls
            index={index}
            total={total}
            autoplay={autoplay}
            paused={paused}
            showPause={!reduceMotion}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            onSelect={setIndex}
            onTogglePause={() => setPaused((p) => !p)}
          />

          {school ? <p className="mt-6 text-sm text-sky-100">{t("hero.school", { school })}</p> : null}
        </div>

        {/* Ảnh trượt ngang + thẻ minh họa; vuốt được trên điện thoại */}
        <div
          className="relative mx-auto w-full max-w-xl sm:pb-12 lg:max-w-none"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            const end = e.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (start != null && end != null) go(swipeDelta(start, end));
          }}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-2xl ring-1 shadow-sky-950/40 ring-white/20">
            <div
              className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {SLIDES.map((slide, i) => (
                <div key={slide.key} className="relative h-full w-full shrink-0" aria-hidden={i !== index}>
                  <Image
                    src={slide.photo}
                    alt={t(`hero.slides.${slide.key}.imageAlt`)}
                    fill
                    sizes="(min-width: 1024px) 560px, (min-width: 640px) 576px, 100vw"
                    placeholder="blur"
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    className={cn("object-cover", slide.photoClass)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-sky-950/50 via-transparent to-transparent" />
                </div>
              ))}
            </div>
          </div>

          {/* Thẻ minh họa theo slide (đổi mờ dần): mobile nằm dưới ảnh, chồng một phần lên mép; từ sm nổi ở góc ảnh */}
          <div className="relative mx-3 -mt-12 grid sm:static sm:m-0" aria-hidden>
            {SLIDES.map(({ key, Card, cardSide }, i) => (
              <div
                key={key}
                className={cn(
                  "[grid-area:1/1] self-end transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none sm:absolute sm:bottom-0 sm:w-80",
                  cardSide === "left" ? "sm:-left-6" : "sm:-right-6",
                  i === index ? "translate-y-0 opacity-100 delay-200" : "pointer-events-none translate-y-3 opacity-0",
                )}
              >
                <Card />
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

function CarouselControls({
  index,
  total,
  autoplay,
  paused,
  showPause,
  onPrev,
  onNext,
  onSelect,
  onTogglePause,
}: {
  index: number;
  total: number;
  autoplay: boolean;
  paused: boolean;
  showPause: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  onTogglePause: () => void;
}) {
  const t = useTranslations("landing");
  const roundButton = "flex size-11 items-center justify-center rounded-full border border-white/30 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none [&_svg]:size-5";
  return (
    <div className="mt-8 flex items-center gap-2">
      <button type="button" className={roundButton} onClick={onPrev} aria-label={t("hero.carousel.prev")}>
        <ChevronLeft aria-hidden />
      </button>
      <div className="flex items-center">
        {Array.from({ length: total }, (_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={t("hero.carousel.goTo", { index: i + 1 })}
              aria-current={active ? "true" : undefined}
              className="group flex h-11 items-center px-1.5 focus-visible:outline-none [&:focus-visible>span]:ring-2 [&:focus-visible>span]:ring-white"
            >
              <span
                className={cn(
                  "block h-2 overflow-hidden rounded-full bg-white/30 transition-[width,background-color] duration-300",
                  active ? "w-10" : "w-2 group-hover:bg-white/60",
                )}
              >
                {active && (
                  // Thanh tiến độ của slide đang xem (key theo index -> chạy lại từ đầu)
                  <span key={index} className="landing-progress block h-full rounded-full bg-white" style={{ animationDuration: `${INTERVAL}ms`, animationPlayState: autoplay ? "running" : "paused" }} />
                )}
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className={roundButton} onClick={onNext} aria-label={t("hero.carousel.next")}>
        <ChevronRight aria-hidden />
      </button>
      {showPause && (
        <button type="button" className={roundButton} onClick={onTogglePause} aria-label={paused ? t("hero.carousel.play") : t("hero.carousel.pause")}>
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        </button>
      )}
    </div>
  );
}

/* ---------- Thẻ minh họa (tĩnh, chỉ trang trí) ---------- */

const CARD = "rounded-2xl bg-white p-4 text-slate-800 shadow-2xl shadow-sky-950/30";

function CardHeader({ icon, title, aside }: { icon: Icon3DName; title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Icon3D name={icon} size={28} />
        {title}
      </span>
      {aside}
    </div>
  );
}

function TutorCard() {
  const t = useTranslations("landing");
  return (
    <div className={CARD}>
      <CardHeader
        icon="robot"
        title={t("preview.title")}
        aside={
          <span className="flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {t("preview.status")}
          </span>
        }
      />
      <p className="mt-3 ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-sky-600 px-3 py-1.5 text-sm text-white">{t("preview.question")}</p>
      <div className="mt-2 rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2 text-sm leading-6">
        <p className="line-clamp-2">{t("preview.answer")}</p>
        <Formula />
      </div>
    </div>
  );
}

/** Công thức v = s / t dạng phân số (không nạp KaTeX cho trang chủ) */
function Formula() {
  return (
    <p className="mt-1 flex items-center justify-center gap-2 font-serif text-lg text-sky-800 italic">
      <span>v</span>
      <span className="not-italic">=</span>
      <span className="inline-flex flex-col items-center leading-none">
        <span>s</span>
        <span className="my-1 h-px w-5 bg-current" />
        <span>t</span>
      </span>
    </p>
  );
}

const QUIZ_OPTIONS = ["a", "b", "c", "d"] as const;

function QuizCard() {
  const t = useTranslations("landing");
  return (
    <div className={CARD}>
      <CardHeader
        icon="books"
        title={t("hero.quiz.title")}
        aside={<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{t("hero.quiz.xp")}</span>}
      />
      <p className="mt-3 text-sm font-medium">{t("hero.quiz.question")}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {QUIZ_OPTIONS.map((option) => {
          const correct = option === "a";
          return (
            <span
              key={option}
              className={cn(
                "flex items-center justify-between gap-1 rounded-xl border px-2.5 py-1.5 text-xs",
                correct ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700" : "border-slate-200 text-slate-600",
              )}
            >
              {t(`hero.quiz.options.${option}`)}
              {correct && <Check className="size-3.5 shrink-0" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function DuelCard() {
  const t = useTranslations("landing");
  return (
    <div className={CARD}>
      <CardHeader
        icon="crossedSwords"
        title={t("hero.duel.title")}
        aside={
          <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 tabular-nums">
            <Timer className="size-3.5" />
            0:08
          </span>
        }
      />
      <div className="mt-3 space-y-2.5">
        <DuelRow name={t("hero.duel.you")} score={120} width="w-4/5" bar="bg-sky-500" />
        <DuelRow name={t("hero.duel.rival")} score={90} width="w-3/5" bar="bg-rose-500" />
      </div>
      <p className="mt-3 text-xs text-slate-500">{t("hero.duel.round")}</p>
    </div>
  );
}

function DuelRow({ name, score, width, bar }: { name: string; score: number; width: string; bar: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{name}</span>
        <span className="font-semibold tabular-nums">{score}</span>
      </div>
      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100">
        <span className={cn("block h-full rounded-full", width, bar)} />
      </span>
    </div>
  );
}
