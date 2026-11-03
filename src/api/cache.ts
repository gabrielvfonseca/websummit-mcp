// In-memory TTL cache. Cleared after any write.

const store = new Map<string, { expiresAt: number; value: unknown }>();

export function get<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) { store.delete(key); return undefined; }
  return e.value as T;
}

export function set(key: string, value: unknown, ttlMs: number): void {
  store.set(key, { expiresAt: Date.now() + ttlMs, value });
}

export function invalidatePrefix(prefix: string): void {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

export function clear(): void {
  store.clear();
}
