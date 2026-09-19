"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { avatarSrc } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/jpg";

/** Read avatar path from LMS upload / user payload shapes. */
export function pickAvatarPath(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const nested = root.data;
  const candidates = [
    root.avatar,
    root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>).avatar
      : null,
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>).avatar
      : null,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c) return c;
  }
  return null;
}

export function AvatarThumb({
  path,
  name,
  size = "sm",
  className,
}: {
  path?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const src = avatarSrc(path);
  const initial = (name || "?").trim().slice(0, 1).toUpperCase() || "?";
  const sizeClass =
    size === "lg"
      ? "h-28 w-28 sm:h-32 sm:w-32 rounded-2xl text-2xl"
      : size === "md"
        ? "h-20 w-20 rounded-2xl text-xl"
        : "h-8 w-8 rounded-full text-xs";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-surface-low font-bold text-primary",
        sizeClass,
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || ""} className="h-full w-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

export function AvatarEditor({
  path,
  name,
  saving,
  onPick,
  size = "lg",
  hint,
}: {
  path?: string | null;
  name?: string | null;
  saving?: boolean;
  onPick: (file: File) => void;
  size?: "md" | "lg";
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const btnSize = size === "lg" ? "h-9 w-9 -bottom-2 -right-2 rounded-xl" : "h-7 w-7 bottom-0 right-0 rounded-full";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative group">
        <AvatarThumb path={path} name={name} size={size} className="shadow-md" />
        <button
          type="button"
          className={cn(
            "absolute flex items-center justify-center bg-primary text-on-primary shadow-md transition-transform hover:scale-105 disabled:opacity-60",
            btnSize,
          )}
          title="Đổi ảnh đại diện"
          disabled={saving}
          onClick={() => fileRef.current?.click()}
        >
          <Camera className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
      </div>
      {hint ? (
        <p className="text-xs text-on-surface-variant">
          {hint}
          {saving ? " · Đang tải..." : ""}
        </p>
      ) : null}
    </div>
  );
}
