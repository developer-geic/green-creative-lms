"use client";

import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { setClientAccessToken } from "@/lib/api";
import { subscribeForbidden, subscribeUnauthorized } from "@/lib/auth-events";

const LOGIN_PATH = "/login";

function isAuthPublicPath(pathname: string) {
  return pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
}

async function forceSignOut() {
  setClientAccessToken(null);
  await signOut({ callbackUrl: LOGIN_PATH });
}

/**
 * Global session guard: refresh failure or API 401 → sign out to /login.
 * API 403 → navigate to /forbidden (session kept).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const signingOutRef = useRef(false);

  const sessionError = (session as { error?: string } | null)?.error;
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  useEffect(() => {
    setClientAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    const unsubUnauthorized = subscribeUnauthorized(() => {
      if (signingOutRef.current) return;
      if (isAuthPublicPath(pathname)) return;
      signingOutRef.current = true;
      void forceSignOut().finally(() => {
        signingOutRef.current = false;
      });
    });

    const unsubForbidden = subscribeForbidden(() => {
      if (isAuthPublicPath(pathname)) return;
      router.replace("/forbidden");
    });

    return () => {
      unsubUnauthorized();
      unsubForbidden();
    };
  }, [pathname, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (isAuthPublicPath(pathname)) return;

    if (sessionError === "RefreshAccessTokenError") {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      void forceSignOut().finally(() => {
        signingOutRef.current = false;
      });
      return;
    }

    if (status === "unauthenticated") {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      void forceSignOut().finally(() => {
        signingOutRef.current = false;
      });
    }
  }, [sessionError, status, pathname]);

  return <>{children}</>;
}
