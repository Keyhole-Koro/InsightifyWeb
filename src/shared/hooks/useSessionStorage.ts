import { useCallback, useState } from "react";

/**
 * Simple hook for persisting a value in localStorage with React state sync.
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T | null = null,
): [T | null, (value: T | null) => void, () => void] {
  const [state, setState] = useState<T | null>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | null) => {
      setState(value);
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
    [key],
  );

  const clear = useCallback(() => {
    setState(null);
    localStorage.removeItem(key);
  }, [key]);

  return [state, setValue, clear];
}

/**
 * Simplified version for string-only storage (no JSON parsing overhead).
 */
export function useStringStorage(
  key: string,
  initialValue: string | null = null,
): [string | null, (value: string | null) => void] {
  const [state, setState] = useState<string | null>(() => {
    if (typeof window === "undefined") return initialValue;
    return localStorage.getItem(key) ?? initialValue;
  });

  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    },
    [key],
  );

  return [state, setValue];
}
