import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // data is fresh for 30 seconds
      retry: 1,                     // retry failed requests once
      refetchOnWindowFocus: false,  // don't refetch when switching tabs
    },
  },
})