"use client";

import { Search } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type SearchFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  /** Extra classes on the outer relative wrapper */
  wrapperClassName?: string;
  type?: "search" | "text";
};

/**
 * Search input with leading icon. Uses !pl-10 so left padding wins over
 * the global `.input { padding }` shorthand (which otherwise covers the placeholder).
 */
export function SearchField({
  className,
  wrapperClassName,
  type = "search",
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
      />
      <input type={type} className={cn("input h-10 !pl-10", className)} {...props} />
    </div>
  );
}
