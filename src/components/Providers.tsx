"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { setClientAccessToken } from "@/lib/api";

function SessionTokenSync({ children }: { children: React.ReactNode }) {
  const { data } = useSession();
  useEffect(() => {
    setClientAccessToken((data as { accessToken?: string } | null)?.accessToken);
  }, [data]);
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <SessionTokenSync>
        {children}
        <Toaster richColors position="top-right" />
      </SessionTokenSync>
    </SessionProvider>
  );
}
