"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authClient } from "../lib/auth-client";

export type SessionUser = {
  name?: string | null;
  email?: string | null;
  planLabel?: string | null;
  remainingCredits?: number | null;
};

type SessionContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);

    try {
      const session = await authClient.getSession();

      if (!session?.data?.session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (data?.ok && data?.user) {
        setUser({
          name: data.user.name ?? null,
          email: data.user.email ?? null,
          planLabel: data.user.planLabel ?? null,
          remainingCredits:
            typeof data.user.remainingCredits === "number" ||
            data.user.remainingCredits === null
              ? data.user.remainingCredits
              : null,
        });
      } else {
        setUser({
          name: session.data.user?.name ?? null,
          email: session.data.user?.email ?? null,
          planLabel: null,
          remainingCredits: null,
        });
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user?.email,
      isLoading,
      refreshSession,
      clearSession,
    }),
    [user, isLoading, refreshSession, clearSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return ctx;
}