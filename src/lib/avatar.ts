const API_ORIGIN =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8880/api/v1").replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8880";

/** Resolve LMS public-disk avatar path to a browser URL. */
export function avatarSrc(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  return `${API_ORIGIN}/storage/${path.replace(/^\//, "")}`;
}
