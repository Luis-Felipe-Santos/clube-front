import { ref } from "vue";
import { useApi } from "~/composables/useApi";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface UseCachedApiOptions {
  ttl?: number;
  staleWhileRevalidate?: boolean;
  cache?: boolean;
}

type PendingRequest = Promise<unknown>;

const CACHE_PREFIX = "app-cache:";

// cache em memória compartilhado
const cache = new Map<string, CacheEntry<unknown>>();

// evita requests duplicadas simultâneas
const pendingRequests = new Map<string, PendingRequest>();

export function useCachedApi(options: UseCachedApiOptions = {}) {
  const {
    ttl = 5 * 60 * 1000, // 5 min
    staleWhileRevalidate = true,
    cache: useCache = true,
  } = options;

  const { get, post, put, patch, del } = useApi();

  const loading = ref(false);

  function generateCacheKey(
    url: string,
    method: string = "GET",
    body?: unknown,
  ) {
    return `${CACHE_PREFIX}${method}:${url}:${JSON.stringify(body || "")}`;
  }

  function isClient() {
    return import.meta.client;
  }

  function isValid(entry: CacheEntry<unknown>) {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  function setLocalStorage(key: string, value: CacheEntry<unknown>) {
    if (!useCache || !isClient()) return;

    localStorage.setItem(key, JSON.stringify(value));
  }

  function getLocalStorage<T>(key: string): CacheEntry<T> | null {
    if (!useCache || !isClient()) return null;

    const raw = localStorage.getItem(key);

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  function removeLocalStorage(key: string) {
    if (!useCache || !isClient()) return;

    localStorage.removeItem(key);
  }

  function setCache<T>(key: string, data: T) {
    if (!useCache) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    cache.set(key, entry);
    setLocalStorage(key, entry);
  }

  async function fetchAndCache<T>(key: string, url: string): Promise<T> {
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key) as Promise<T>;
    }

    loading.value = true;

    const request = get<T>(url)
      .then((data) => {
        setCache(key, data);
        return data;
      })
      .finally(() => {
        pendingRequests.delete(key);
        loading.value = false;
      });

    pendingRequests.set(key, request);

    return request;
  }

  async function cachedGet<T>(url: string): Promise<T> {
    if (!useCache) {
      return await get<T>(url);
    }

    const key = generateCacheKey(url);

    // 1 memória
    let cached = cache.get(key) as CacheEntry<T> | undefined;

    // 2 localStorage
    if (!cached) {
      const local = getLocalStorage<T>(key);

      if (local) {
        cached = local;
        cache.set(key, local);
      }
    }

    // cache válido
    if (cached && isValid(cached)) {
      return cached.data;
    }

    // cache expirado
    if (cached && staleWhileRevalidate) {
      fetchAndCache<T>(key, url).catch(() => {});
      return cached.data;
    }

    // remove cache vencido
    if (cached) {
      cache.delete(key);
      removeLocalStorage(key);
    }

    // busca api
    return fetchAndCache<T>(key, url);
  }

  function invalidateAll() {
    cache.clear();

    if (!isClient()) return;

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  function invalidateByUrl(url: string) {
    if (!useCache) return;

    const normalizedUrl = url.split("?")[0].replace(/\/$/, "");
    const pathSegments = normalizedUrl.split("/").filter(Boolean);

    const cachePrefixes = new Set<string>([normalizedUrl]);

    if (pathSegments.length > 0) {
      cachePrefixes.add(`/${pathSegments[0]}`);
    }

    if (pathSegments.length > 1) {
      cachePrefixes.add(`/${pathSegments[0]}/${pathSegments[1]}`);
    }

    for (const key of [...cache.keys()]) {
      const cacheKey = key.replace(new RegExp(`^${CACHE_PREFIX}[A-Z]+:`), "");

      if ([...cachePrefixes].some((prefix) => cacheKey.includes(prefix))) {
        cache.delete(key);
      }
    }

    if (!isClient()) return;

    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith(CACHE_PREFIX) &&
        [...cachePrefixes].some((prefix) => key.includes(prefix))
      ) {
        localStorage.removeItem(key);
      }
    });
  }

  async function cachedPost<T, B>(url: string, body: B): Promise<T> {
    loading.value = true;

    try {
      const result = await post<T, B>(url, body);
      invalidateByUrl(url);
      return result;
    } finally {
      loading.value = false;
    }
  }

  async function cachedPut<T, B>(url: string, body: B): Promise<T> {
    loading.value = true;

    try {
      const result = await put<T, B>(url, body);
      invalidateByUrl(url);
      return result;
    } finally {
      loading.value = false;
    }
  }

  async function cachedPatch<T, B>(url: string, body?: B): Promise<T> {
    loading.value = true;

    try {
      const result = await patch<T, B>(url, body);
      invalidateByUrl(url);
      return result;
    } finally {
      loading.value = false;
    }
  }

  async function cachedDelete<T>(url: string): Promise<T> {
    loading.value = true;

    try {
      const result = await del<T>(url);
      invalidateByUrl(url);
      return result;
    } finally {
      loading.value = false;
    }
  }

  function getCacheSize() {
    return cache.size;
  }

  return {
    loading,

    get: cachedGet,
    post: cachedPost,
    put: cachedPut,
    patch: cachedPatch,
    del: cachedDelete,

    invalidateAll,
    invalidateByUrl,
    getCacheSize,
  };
}
