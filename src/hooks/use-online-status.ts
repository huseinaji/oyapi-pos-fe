import { useEffect, useState } from 'react';

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
    // Set initial online status after hydration
    setIsOnline(navigator.onLine);
    setIsHydrated(true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Always return true during SSR/hydration to match server
  if (!isHydrated) return true;

  return isOnline;
}
