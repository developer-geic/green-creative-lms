"use client";

import { useCallback, useEffect, useState } from "react";
import { lmsApi } from "@/lib/api";
import type { LmsMenuItem } from "@/types/lms";

type MeCache = {
  permissions: string[];
  menus: LmsMenuItem[];
  isAdmin: boolean;
};

let cache: MeCache | null = null;
let inflight: Promise<MeCache> | null = null;

async function loadMe(): Promise<MeCache> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = lmsApi
    .me()
    .then((res) => {
      const data = res.data || {};
      const user = data.user || {};
      const next: MeCache = {
        permissions: data.permissions || user.permissions || [],
        menus: data.menus || [],
        isAdmin: user.role === "admin",
      };
      cache = next;
      return next;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateMeCache() {
  cache = null;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>(cache?.permissions || []);
  const [menus, setMenus] = useState<LmsMenuItem[]>(cache?.menus || []);
  const [isAdmin, setIsAdmin] = useState(cache?.isAdmin || false);
  const [ready, setReady] = useState(Boolean(cache));

  const refresh = useCallback(async () => {
    cache = null;
    const next = await loadMe();
    setPermissions(next.permissions);
    setMenus(next.menus);
    setIsAdmin(next.isAdmin);
    setReady(true);
    return next;
  }, []);

  useEffect(() => {
    loadMe()
      .then((next) => {
        setPermissions(next.permissions);
        setMenus(next.menus);
        setIsAdmin(next.isAdmin);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const can = useCallback(
    (code: string) => isAdmin || permissions.includes(code),
    [isAdmin, permissions],
  );

  return { permissions, menus, isAdmin, ready, can, refresh };
}
