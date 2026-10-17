"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ImagePlus, Loader2, Mic, MicOff, SendHorizonal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { IMAGE_ACCEPT, MAX_IMAGE_MB, validateImageFile } from "../../shared/imageFile";
import { useSpeechRecognition } from "../useSpeechRecognition";

const MAX_CONTENT = 4000;

interface ComposerProps {
  /** Trả `false` khi gửi lỗi -> khôi phục nội dung đã gõ */
  onSend: (content: string, image: File | null) => Promise<boolean>;
  busy: boolean;
  /** Đổi giá trị để đặt sẵn nội dung (vd. bấm câu hỏi gợi ý) */
  preset?: { text: string; nonce: number } | null;
}

/** Ô nhập câu hỏi: Enter gửi, Shift+Enter xuống dòng, đính kèm ảnh (xem trước), nói thay gõ */
export function Composer({ onSend, busy, preset }: ComposerProps) {
  const t = useTranslations("learnChat");
  const locale = useLocale();
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [appliedPreset, setAppliedPreset] = useState(preset);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeechRecognition(locale === "en" ? "en-US" : "vi-VN");

  // Câu hỏi gợi ý -> đặt vào ô nhập (đồng bộ theo prop ngay trong render)
  if (preset !== appliedPreset) {
    setAppliedPreset(preset);
    if (preset) setText(preset.text);
  }

  // Thu hồi URL xem trước khi rời trang
  const imageUrl = image?.url;
  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem === "type" ? t("composer.imageType") : t("composer.imageSize", { size: MAX_IMAGE_MB }));
      return;
    }
    setImage({ file, url: URL.createObjectURL(file) });
  };

  const submit = async () => {
    const content = text.trim();
    if (busy || (!content && !image)) return;
    const file = image?.file ?? null;
    setText("");
    setImage(null);
    const ok = await onSend(content, file);
    if (!ok) {
      setText(content);
      if (file) setImage({ file, url: URL.createObjectURL(file) });
    }
    inputRef.current?.focus();
  };

  const toggleVoice = () => {
    if (speech.listening) return speech.stop();
    speech.start(
      (spoken) => setText((prev) => (prev ? `${prev} ${spoken}` : spoken).slice(0, MAX_CONTENT)),
      (code) => toast.error(code === "not-allowed" ? t("composer.micDenied") : t("composer.micError")),
    );
  };

  return (
    <div className="border-t bg-[var(--c-surface)] p-3">
      {image && (
        <div className="mb-2 inline-flex items-start gap-1 rounded-lg border bg-[var(--c-bg-subtle)] p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={t("composer.imagePreview")} className="h-16 w-auto max-w-[160px] rounded-md object-cover" />
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setImage(null)} aria-label={t("composer.removeImage")}>
            <X />
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            pickImage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button variant="ghost" size="icon" className="size-10 shrink-0" onClick={() => fileRef.current?.click()} disabled={busy} aria-label={t("composer.attachImage")}>
          <ImagePlus />
        </Button>
        {speech.supported && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-10 shrink-0", speech.listening && "bg-[var(--c-error-bg)] text-[var(--c-error)] hover:bg-[var(--c-error-bg)]")}
            onClick={toggleVoice}
            disabled={busy}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? t("composer.stopVoice") : t("composer.voice")}
          >
            {speech.listening ? <MicOff className="animate-pulse" /> : <Mic />}
          </Button>
        )}
        <Textarea
          ref={inputRef}
          value={text}
          maxLength={MAX_CONTENT}
          rows={1}
          placeholder={speech.listening ? t("composer.listening") : t("composer.placeholder")}
          aria-label={t("composer.placeholder")}
          className="max-h-40 min-h-10 flex-1 resize-none field-sizing-content py-2"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button size="icon" className="size-10 shrink-0" onClick={submit} disabled={busy || (!text.trim() && !image)} aria-label={t("composer.send")}>
          {busy ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
        </Button>
      </div>
      <p className="mt-1.5 hidden text-[11px] text-muted-foreground sm:block">{t("composer.hint")}</p>
    </div>
  );
}
