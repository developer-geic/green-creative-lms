"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeRangeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  startAriaLabel?: string;
  endAriaLabel?: string;
};

type MenuPos = { top: number; left: number; width: number };

/** 00–24. 24:00 is the end of the day. */
const HOURS = Array.from({ length: 25 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function normalizeTime(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return "";
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour === 24 && minute === 0) return "24:00";
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Accepts a full range, or one side while the other is still empty. */
function parseTimeRange(value: string): { start: string; end: string } {
  const trimmed = value.trim();
  if (!trimmed) return { start: "", end: "" };
  const parts = trimmed.split(/\s*[-–—]\s*/);
  if (parts.length >= 2) {
    return {
      start: normalizeTime(parts[0] ?? ""),
      end: normalizeTime(parts[1] ?? ""),
    };
  }
  return { start: normalizeTime(parts[0] ?? ""), end: "" };
}

function formatTimeRange(start: string, end: string): string {
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - `;
  if (end) return ` - ${end}`;
  return "";
}

function splitTime(value: string): { hour: string; minute: string } {
  if (!value) return { hour: "", minute: "" };
  const [hour = "", minute = ""] = value.split(":");
  return { hour, minute };
}

function parseUnit(raw: string, max: number): string | null {
  const t = raw.trim();
  if (!t) return "";
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  if (n > max) return null;
  return String(n).padStart(2, "0");
}

function filterUnits(options: string[], query: string): string[] {
  const digits = query.trim().replace(/\D/g, "");
  if (!digits) return options;
  return options.filter((opt) => opt.startsWith(digits) || String(Number(opt)).startsWith(digits));
}

function UnitSuggest({
  value,
  options,
  max,
  onChange,
  disabled,
  ariaLabel,
  placeholder,
}: {
  value: string;
  options: string[];
  max: number;
  onChange: (next: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  /** null = show the full list; a string filters as the user types. */
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const suggestions = filterUnits(options, query ?? "");
  const activeIndex = suggestions.length === 0 ? 0 : Math.min(active, suggestions.length - 1);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (query === null) {
      const idx = options.indexOf(value);
      setActive(idx >= 0 ? idx : 0);
      return;
    }
    setActive(0);
  }, [query, value, options]);

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
      width: Math.max(rect.width, 88),
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

  function commitDraft() {
    const parsed = parseUnit(draft, max);
    if (parsed === null) {
      setDraft(value);
    } else {
      setDraft(parsed);
      if (parsed !== value) onChange(parsed);
    }
    setOpen(false);
  }

  function choose(next: string) {
    setDraft(next);
    setOpen(false);
    if (next !== value) onChange(next);
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, suggestions.length]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (/^\d$/.test(e.key)) {
      const el = e.currentTarget;
      const replacing = el.selectionStart !== el.selectionEnd;
      if (!replacing && draft.length >= 2) {
        e.preventDefault();
        setDraft(e.key);
        setQuery(e.key);
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setDraft(value);
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const picked = open ? suggestions[activeIndex] : undefined;
      if (picked) choose(picked);
      else commitDraft();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((i) => Math.max(i - 1, 0));
    }
  }

  const menu =
    open && pos
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
              transform:
                pos.top < (rootRef.current?.getBoundingClientRect().top ?? 0)
                  ? "translateY(-100%)"
                  : undefined,
              zIndex: 80,
            }}
            className="max-h-56 overflow-auto rounded-xl border border-surface-high bg-surface py-1 shadow-lg"
          >
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-on-surface-variant">Không có số khớp</li>
            ) : (
              suggestions.map((slot, index) => {
                const selected = slot === value;
                const isActive = index === activeIndex;
                return (
                  <li key={slot} role="option" aria-selected={selected} id={`${listId}-${index}`}>
                    <button
                      type="button"
                      data-active={isActive ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center px-3 py-1.5 text-left text-sm",
                        isActive
                          ? "bg-primary-soft/40 font-semibold text-primary-dark"
                          : "text-foreground hover:bg-surface-low",
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(slot)}
                    >
                      {slot}
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
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && suggestions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={draft}
        className="h-10 w-[4.75rem] rounded-lg bg-surface-low pl-2.5 pr-6 text-sm font-semibold text-foreground outline-none focus:bg-surface focus:shadow-[0_0_0_2px_var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          let next = digits;
          if (draft && digits.length > draft.length && digits.startsWith(draft)) {
            next = digits.slice(draft.length);
          }
          next = next.slice(0, 2);
          setDraft(next);
          setQuery(next);
          setOpen(true);
        }}
        onFocus={(e) => {
          if (disabled) return;
          setQuery(null);
          setOpen(true);
          e.currentTarget.select();
        }}
        onBlur={commitDraft}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${ariaLabel}: mở danh sách`}
        disabled={disabled}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-on-surface-variant hover:text-foreground disabled:opacity-50"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (disabled) return;
          if (open) commitDraft();
          else {
            setQuery(null);
            setOpen(true);
            inputRef.current?.focus();
            inputRef.current?.select();
          }
        }}
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {menu}
    </div>
  );
}

function TimePart({
  value,
  onChange,
  disabled,
  hourLabel,
  minuteLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  hourLabel: string;
  minuteLabel: string;
}) {
  const { hour, minute } = splitTime(value);
  const endOfDay = hour === "24";

  return (
    <div className="flex items-center gap-1">
      <UnitSuggest
        value={hour}
        options={HOURS}
        max={24}
        disabled={disabled}
        ariaLabel={hourLabel}
        placeholder="Giờ"
        onChange={(nextHour) => {
          if (!nextHour) {
            onChange("");
            return;
          }
          if (nextHour === "24") {
            onChange("24:00");
            return;
          }
          onChange(`${nextHour}:${minute || "00"}`);
        }}
      />
      <span className="text-xs font-semibold text-on-surface-variant" aria-hidden>
        :
      </span>
      <UnitSuggest
        value={endOfDay ? "00" : minute}
        options={MINUTES}
        max={59}
        disabled={disabled || !hour || endOfDay}
        ariaLabel={minuteLabel}
        placeholder="Phút"
        onChange={(nextMinute) => {
          if (!hour || hour === "24") return;
          onChange(`${hour}:${nextMinute || "00"}`);
        }}
      />
    </div>
  );
}

export function TimeRangeField({
  value,
  onChange,
  disabled,
  className,
  startAriaLabel = "Giờ bắt đầu",
  endAriaLabel = "Giờ kết thúc",
}: TimeRangeFieldProps) {
  const [start, setStart] = useState(() => parseTimeRange(value).start);
  const [end, setEnd] = useState(() => parseTimeRange(value).end);

  useEffect(() => {
    const next = parseTimeRange(value);
    setStart(next.start);
    setEnd(next.end);
  }, [value]);

  function commit(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    onChange(formatTimeRange(nextStart, nextEnd));
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-on-surface-variant">Từ</span>
        <TimePart
          value={start}
          disabled={disabled}
          hourLabel={startAriaLabel}
          minuteLabel="Phút bắt đầu"
          onChange={(next) => commit(next, end)}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-on-surface-variant">Đến</span>
        <TimePart
          value={end}
          disabled={disabled}
          hourLabel={endAriaLabel}
          minuteLabel="Phút kết thúc"
          onChange={(next) => commit(start, next)}
        />
      </div>
    </div>
  );
}
