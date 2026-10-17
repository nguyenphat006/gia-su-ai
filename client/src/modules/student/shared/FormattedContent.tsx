"use client";

import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { normalizeMath } from "./mathText";

// Kiểu chữ markdown (không dùng plugin typography): khoảng cách theo thang 4/8, màu theo token
const BLOCK_CLASS = cn(
  "min-w-0 break-words text-sm leading-relaxed",
  "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1",
  "[&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold",
  "[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_strong]:font-semibold",
  "[&_code]:rounded [&_code]:bg-[var(--c-bg-muted)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-[var(--c-bg-muted)] [&_pre]:p-3",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--c-primary-border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--c-text-2)]",
  "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:bg-[var(--c-bg-muted)] [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:px-2 [&_td]:py-1",
  "[&_a]:text-[var(--c-primary)] [&_a]:underline [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden",
);

const INLINE_COMPONENTS: Components = {
  p: ({ children }) => <>{children}</>,
};

const BLOCK_COMPONENTS: Components = {
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

interface FormattedContentProps {
  content: string | null | undefined;
  className?: string;
  /** Hiển thị trong dòng (nhãn đáp án, nút sơ đồ) — bỏ thẻ <p> */
  inline?: boolean;
}

/** Nội dung Markdown + công thức LaTeX (KaTeX) — dùng cho gia sư AI, ôn tập, đấu trường */
function FormattedContentImpl({ content, className, inline = false }: FormattedContentProps) {
  if (!content) return null;
  const text = normalizeMath(content);
  if (inline) {
    return (
      <span className={cn("min-w-0 break-words [&_.katex]:text-[1em]", className)}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={INLINE_COMPONENTS}>
          {text}
        </ReactMarkdown>
      </span>
    );
  }
  return (
    <div className={cn(BLOCK_CLASS, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={BLOCK_COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

export const FormattedContent = memo(FormattedContentImpl);
export default FormattedContent;
