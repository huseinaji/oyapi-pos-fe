import { lazy, Suspense, type FC } from "react"
import { RoutesIndex } from "./routes"
import { Toaster } from './components/ui/sonner';
import { ThemeScript } from './components/theme-script';
import { DismissToastsOnInteraction } from './components/ui/dismiss-toasts-on-interaction';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Devtools are lazy-loaded and only rendered in development.
// This keeps them out of the production bundle entirely.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : null;

const queryClient = new QueryClient();

export const App: FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeScript />
      <DismissToastsOnInteraction />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--card)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '13px',
          },
        }}
        richColors
      />
      <RoutesIndex />
      {ReactQueryDevtools && (
        <Suspense>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
