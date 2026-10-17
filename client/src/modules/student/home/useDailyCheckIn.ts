"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import { learnService } from "../shared/learn.service";
import { LEARN_STATS_KEY } from "../shared/useLearnQueries";

const KEY_PREFIX = "learn_checkin_";

/** Ngày địa phương dạng YYYY-MM-DD */
export function localDay(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Điểm danh đầu ngày: gọi `POST /learn/me/check-in/` tối đa 1 lần / ngày / tài khoản trên trình duyệt này
 * (server cũng không cộng trùng). Đồng bộ với hệ thống ngoài -> effect chỉ gọi API, không setState.
 */
export function useDailyCheckIn(enabled: boolean) {
  const t = useTranslations("learn");
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!enabled || !userId) return;
    const key = `${KEY_PREFIX}${userId}`;
    const today = localDay();
    try {
      if (localStorage.getItem(key) === today) return;
      localStorage.setItem(key, today);
    } catch {
      // localStorage bị chặn -> vẫn gọi (server idempotent)
    }
    learnService
      .checkIn()
      .then((res) => {
        if (res.checked_in) toast.success(t("checkIn.toast", { count: res.current_streak }));
        queryClient.invalidateQueries({ queryKey: LEARN_STATS_KEY });
      })
      .catch(() => {
        // Lỗi điểm danh không chặn trang chủ; cho phép thử lại lần mở sau
        try {
          localStorage.removeItem(key);
        } catch {}
      });
  }, [enabled, userId, t, queryClient]);
}
