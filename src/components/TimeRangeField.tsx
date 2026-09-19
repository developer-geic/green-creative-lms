"use client";

import { cn } from "@/lib/utils";

type TimeRangeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  startAriaLabel?: string;
  endAriaLabel?: string;
};

function parseTimeRange(value: string): { start: string; end: string } {
  const m = value.trim().match(/^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})$/);
  if (!m) return { start: "", end: "" };
  return { start: normalizeTime(m[1]), end: normalizeTime(m[2]) };
}

/** Ensure HH:mm for input[type=time]. */
function normalizeTime(t: string): string {
  const [h, m] = t.split(":");
  return `${String(Number(h)).padStart(2, "0")}:${String(Number(m)).padStart(2, "0")}`;
}

function formatTimeRange(start: string, end: string): string {
  if (!start && !end) return "";
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

export function TimeRangeField({
  value,
  onChange,
  disabled,
  className,
  startAriaLabel = "Giờ bắt đầu",
  endAriaLabel = "Giờ kết thúc",
}: TimeRangeFieldProps) {
  const { start, end } = parseTimeRange(value);

  function update(nextStart: string, nextEnd: string) {
    onChange(formatTimeRange(nextStart, nextEnd));
  }

  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg bg-surface-low px-2 transition-shadow focus-within:bg-surface focus-within:shadow-[0_0_0_2px_var(--primary)]",
        disabled && "opacity-50",
        className,
      )}
    >
      <input
        type="time"
        aria-label={startAriaLabel}
        disabled={disabled}
        value={start}
        className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-foreground outline-none"
        onChange={(e) => update(e.target.value, end)}
      />
      <span className="shrink-0 text-xs font-semibold text-on-surface-variant" aria-hidden>
        –
      </span>
      <input
        type="time"
        aria-label={endAriaLabel}
        disabled={disabled}
        value={end}
        className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-foreground outline-none"
        onChange={(e) => update(start, e.target.value)}
      />
    </div>
  );
}
