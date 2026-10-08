"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TooltipProps = {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
};

/** Lightweight hover tooltip (no portal). Wrap icon/action buttons. */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[12rem] -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-center text-[11px] font-medium text-surface opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        )}
      >
        {content}
      </span>
    </span>
  );
}
