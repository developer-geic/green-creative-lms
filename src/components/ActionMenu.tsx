"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export type ActionMenuEntry = ActionMenuItem | { type: "divider"; key: string };

type ActionMenuProps = {
  items: ActionMenuEntry[];
  "aria-label"?: string;
  className?: string;
};

type MenuPos = { top: number; left: number; openUp: boolean };

const MENU_WIDTH = 220;
const MENU_MAX_H = 280;

export function ActionMenu({
  items,
  "aria-label": ariaLabel = "Hành động",
  className,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePos() {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_MAX_H && rect.top > spaceBelow;
    const preferredLeft = rect.right - MENU_WIDTH;
    const left = Math.min(
      Math.max(8, preferredLeft),
      window.innerWidth - MENU_WIDTH - 8,
    );
    setPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left,
      openUp,
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
  }, [open]);

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

  function close() {
    setOpen(false);
  }

  const menu =
    open && mounted && pos
      ? createPortal(
          <div
            ref={listRef}
            id={listId}
            role="menu"
            aria-label={ariaLabel}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: MENU_WIDTH,
              transform: pos.openUp ? "translateY(-100%)" : undefined,
              zIndex: 80,
            }}
            className="max-h-[280px] overflow-auto rounded-xl border border-surface-high bg-surface py-1 shadow-lg"
          >
            {items.map((entry, index) => {
              if ("type" in entry && entry.type === "divider") {
                const prev = items[index - 1];
                const next = items[index + 1];
                if (!prev || !next) return null;
                if ("type" in prev || "type" in next) return null;
                return (
                  <div
                    key={entry.key}
                    role="separator"
                    className="my-1 border-t border-border"
                  />
                );
              }

              const item = entry as ActionMenuItem;
              const itemClass = cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                item.disabled
                  ? "cursor-not-allowed opacity-40"
                  : item.danger
                    ? "text-danger hover:bg-danger-container"
                    : "text-foreground hover:bg-surface-low",
              );

              if (item.href && !item.disabled) {
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    role="menuitem"
                    className={itemClass}
                    onClick={close}
                  >
                    {item.icon ? (
                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={itemClass}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onClick?.();
                    close();
                  }}
                >
                  {item.icon ? (
                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                      {item.icon}
                    </span>
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--primary)]"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu}
    </div>
  );
}
