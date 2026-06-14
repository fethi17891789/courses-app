const store = new Map<string, unknown>();

export function getCache<T>(key: string): T | null {
  return store.has(key) ? (store.get(key) as T) : null;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, data);
}
