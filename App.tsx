import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { CartProvider } from "./src/features/cart/CartContext";
import { installStoopingNotificationHandler } from "./src/features/notifications";

export default function App() {
  useEffect(() => {
    installStoopingNotificationHandler();
  }, []);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 1000 * 60 * 3
          }
        }
      }),
    []
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </CartProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
