"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <AuthGuard>
        {children}
        <Toaster richColors position="top-right" />
      </AuthGuard>
    </SessionProvider>
  );
}
