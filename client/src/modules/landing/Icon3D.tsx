import Image from "next/image";
import { cn } from "@/lib/utils";
import { ICONS3D, type Icon3DName } from "./assets";

/** Icon 3D (Fluent Emoji) — trang trí nên mặc định alt rỗng; truyền `label` khi icon mang nghĩa */
export function Icon3D({ name, size = 40, className, label }: { name: Icon3DName; size?: number; className?: string; label?: string }) {
  return (
    <Image
      src={ICONS3D[name]}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}
