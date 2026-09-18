type Listener = () => void;

let unauthorizedListener: Listener | null = null;
let forbiddenListener: Listener | null = null;
let unauthorizedInFlight = false;
let forbiddenInFlight = false;

/** Register the single AuthGuard handler for 401 / dead session. */
export function subscribeUnauthorized(listener: Listener): () => void {
  unauthorizedListener = listener;
  return () => {
    if (unauthorizedListener === listener) unauthorizedListener = null;
  };
}

/** Register the single handler that navigates to /forbidden on API 403. */
export function subscribeForbidden(listener: Listener): () => void {
  forbiddenListener = listener;
  return () => {
    if (forbiddenListener === listener) forbiddenListener = null;
  };
}

/** Fire once until the next successful subscribe cycle / reset. */
export function notifyUnauthorized(): void {
  if (typeof window === "undefined") return;
  if (unauthorizedInFlight) return;
  unauthorizedInFlight = true;
  try {
    unauthorizedListener?.();
  } finally {
    // Allow a later session recovery (e.g. re-login) to notify again
    queueMicrotask(() => {
      unauthorizedInFlight = false;
    });
  }
}

export function notifyForbidden(): void {
  if (typeof window === "undefined") return;
  if (forbiddenInFlight) return;
  if (window.location.pathname.startsWith("/forbidden")) return;
  forbiddenInFlight = true;
  try {
    forbiddenListener?.();
  } finally {
    queueMicrotask(() => {
      forbiddenInFlight = false;
    });
  }
}
