"use client";

import { useSystemSettings } from "@/hooks/useSystemSettings";
import { cn } from "@/lib/utils";
import { bodyFont, displayFont } from "./fonts";
import { HeroCarousel } from "./HeroCarousel";
import { LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";
import { LandingSections } from "./LandingSections";
import { usePrimaryAction } from "./usePrimaryAction";

/** Trang chủ công khai: giới thiệu nền tảng, lối vào đăng nhập / cổng học sinh / trang quản trị */
export function LandingView() {
  const branding = useSystemSettings();
  const action = usePrimaryAction();

  return (
    <div id="top" className={cn("theme-learn landing min-h-screen text-foreground", displayFont.variable, bodyFont.variable)}>
      <LandingHeader branding={branding} action={action} />
      <HeroCarousel action={action} school={branding.owner} />
      <LandingSections action={action} />
      <LandingFooter branding={branding} />
    </div>
  );
}
