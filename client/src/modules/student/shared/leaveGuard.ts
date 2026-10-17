"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { create } from "zustand";
import { useConfirm } from "@/components/feedback/confirm";

interface LeaveGuardState {
  /** Đang trong trận đấu -> rời trang cần xác nhận */
  active: boolean;
  /** Gọi trước khi rời (vd. gửi match.leave) */
  onLeave: (() => void) | null;
  set: (onLeave: (() => void) | null) => void;
}

/** Chặn rời trang khi đang làm việc dở (trận đấu) — khung giao diện học sinh đọc cờ này trước khi điều hướng */
export const useLeaveGuardStore = create<LeaveGuardState>((set) => ({
  active: false,
  onLeave: null,
  set: (onLeave) => set({ active: Boolean(onLeave), onLeave }),
}));

/** Điều hướng có hỏi xác nhận nếu đang trong trận. Trả `true` khi được phép đi tiếp. */
export function useGuardedLeave() {
  const t = useTranslations("learn");
  const confirm = useConfirm();
  const router = useRouter();

  const allowLeave = async (): Promise<boolean> => {
    const { active, onLeave, set } = useLeaveGuardStore.getState();
    if (!active) return true;
    const ok = await confirm({ title: t("leaveGuard.title"), description: t("leaveGuard.description"), confirmText: t("leaveGuard.confirm"), danger: true });
    if (!ok) return false;
    onLeave?.();
    set(null);
    return true;
  };

  const navigate = async (href: string) => {
    if (await allowLeave()) router.push(href);
  };

  return { allowLeave, navigate };
}
