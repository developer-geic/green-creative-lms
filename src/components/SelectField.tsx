"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  optionClassName?: string;
};

type SelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  triggerClassName?: string;
  id?: string;
  "aria-label"?: string;
};

type MenuPos = { top: number; left: number; width: number };

export function SelectField({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  required,
  disabled,
  size = "md",
  className,
  triggerClassName,
  id,
  "aria-label": ariaLabel,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePos() {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuMax = 224;
    const openUp = spaceBelow < menuMax && rect.top > spaceBelow;
    setPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, size === "sm" ? 112 : 160),
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    function onScroll() {
      updatePos();
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, size]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(opt: SelectOption) {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  }

  const menu =
    open && mounted && pos
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              transform: pos.top < (rootRef.current?.getBoundingClientRect().top ?? 0) ? "translateY(-100%)" : undefined,
              zIndex: 80,
            }}
            className={cn(
              "max-h-56 overflow-auto rounded-xl border border-surface-high bg-surface py-1 shadow-lg",
              size === "sm" && "text-[11px]",
            )}
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-on-surface-variant">Không có lựa chọn</li>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value || "__empty"} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      disabled={opt.disabled}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors",
                        size === "sm" ? "py-1.5" : "py-2",
                        opt.optionClassName,
                        opt.disabled
                          ? "cursor-not-allowed opacity-40"
                          : isSelected && !opt.optionClassName
                            ? "bg-primary-soft/40 font-semibold text-primary-dark"
                            : !opt.optionClassName
                              ? "text-foreground hover:bg-surface-low"
                              : isSelected
                                ? "font-semibold ring-1 ring-inset ring-primary/30"
                                : "hover:opacity-90",
                      )}
                      onClick={() => select(opt)}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={value}
          required
          onChange={() => {}}
        />
      ) : null}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg text-left text-sm text-foreground outline-none transition-shadow",
          !triggerClassName && "bg-surface-low hover:bg-surface-high/60",
          "focus-visible:shadow-[0_0_0_2px_var(--primary)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8 px-2.5 text-[11px] font-semibold" : "h-10 px-3",
          triggerClassName,
        )}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <span className={cn("truncate", !selected && "text-on-surface-variant")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "shrink-0 text-on-surface-variant transition-transform",
            size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
            open && "rotate-180",
          )}
        />
      </button>
      {menu}
    </div>
  );
}
