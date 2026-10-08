import { useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';

/**
 * Returns true when the browser has network connectivity.
 * Uses navigator.onLine and listens to the "online" / "offline"
 * window events for updates.
 *
 * Starts with null to avoid hydration mismatch, then updates on mount.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkReachability = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);

      try {
        // Any HTTP response means the backend is reachable, including 401.
        await fetch(`${API_BASE}/api/v1/auth/me`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (isMounted) setIsOnline(true);
      } catch {
        if (isMounted) setIsOnline(false);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    setIsOnline(navigator.onLine);
    setIsHydrated(true);

    const handleOnline = () => void checkReachability();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const intervalId = window.setInterval(() => {
      void checkReachability();
    }, 30000);
    void checkReachability();

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(intervalId);
    };
  }, []);

  // Always return true during SSR/hydration to match server
  if (!isHydrated) return true;

  return isOnline;
}
