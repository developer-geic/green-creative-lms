"use client";

import { useCallback, useEffect, useState } from "react";
import { lmsApi } from "@/lib/api";
import type { LmsCatalogItem } from "@/types/lms";

export type CatalogType = "programs" | "courses" | "student-statuses" | "absorption-levels";

type CacheEntry = {
  data: LmsCatalogItem[];
  fetchedAt: number;
  promise?: Promise<LmsCatalogItem[]>;
};

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function cacheKey(type: CatalogType, includeInactive: boolean, programId?: number | null) {
  return `${type}|${includeInactive ? 1 : 0}|${programId ?? ""}`;
}

async function fetchCatalog(
  type: CatalogType,
  includeInactive: boolean,
  programId?: number | null,
): Promise<LmsCatalogItem[]> {
  const key = cacheKey(type, includeInactive, programId);
  const existing = cache.get(key);
  const now = Date.now();
  if (existing && now - existing.fetchedAt < CACHE_TTL_MS && !existing.promise) {
    return existing.data;
  }
  if (existing?.promise) {
    return existing.promise;
  }

  const promise = (async () => {
    let res;
    switch (type) {
      case "programs":
        res = await lmsApi.catalogPrograms(includeInactive);
        break;
      case "courses":
        res = await lmsApi.catalogCourses(programId, includeInactive);
        break;
      case "student-statuses":
        res = await lmsApi.catalogStudentStatuses(includeInactive);
        break;
      case "absorption-levels":
        res = await lmsApi.catalogAbsorptionLevels(includeInactive);
        break;
    }
    const data = (res.data || []) as LmsCatalogItem[];
    cache.set(key, { data, fetchedAt: Date.now() });
    return data;
  })();

  cache.set(key, { data: existing?.data || [], fetchedAt: existing?.fetchedAt || 0, promise });
  try {
    return await promise;
  } finally {
    const entry = cache.get(key);
    if (entry) {
      delete entry.promise;
    }
  }
}

export function invalidateCatalogCache(type?: CatalogType) {
  if (!type) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${type}|`)) cache.delete(key);
  }
}

export function useCatalog(
  type: CatalogType,
  options?: { includeInactive?: boolean; programId?: number | null; enabled?: boolean },
) {
  const includeInactive = options?.includeInactive ?? false;
  const programId = options?.programId;
  const enabled = options?.enabled ?? true;
  const [items, setItems] = useState<LmsCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalog(type, includeInactive, programId);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Không tải được danh mục");
    } finally {
      setLoading(false);
    }
  }, [type, includeInactive, programId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }
    reload();
  }, [reload, enabled]);

  return { items, loading, error, reload, invalidate: () => invalidateCatalogCache(type) };
}
