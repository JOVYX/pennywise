/**
 * Manages browser storage persistence via navigator.storage.persist()
 * Critical on iOS Safari to mitigate the 7-day storage eviction policy.
 */

export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

export async function checkStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persisted === 'function') {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}
