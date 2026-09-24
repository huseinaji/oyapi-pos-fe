import type { FC } from "react"
import { RoutesIndex } from "./routes"
import { Toaster } from './components/ui/sonner';
import { ThemeScript } from './components/theme-script';
import { DismissToastsOnInteraction } from './components/ui/dismiss-toasts-on-interaction';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}