import { useEffect } from 'react';

/**
 * ThemeScript — handles theme initialization immediately on mount.
 *
 * This component applies the theme as early as possible during client-side
 * hydration to minimize FOUC (flash of unstyled content).
 *
 * Note: In Next.js 16 + React 19, there's no way to run code before hydration
 * without causing hydration mismatches. This is the recommended approach.
 */
export function ThemeScript() {
  useEffect(() => {
    // This runs immediately after the component mounts (during hydration)
    // Apply theme from localStorage synchronously
    const stored = localStorage.getItem('pos-theme');
    const prefersLight = window.matchMedia(
      '(prefers-color-scheme: light)',
    ).matches;
    const theme =
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';

    const resolved = theme === 'dark' || (theme === 'system' && prefersLight);

    if (resolved) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // This component renders nothing
  return null;
}
