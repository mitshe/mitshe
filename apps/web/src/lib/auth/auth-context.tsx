"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { AuthContextValue } from "./types";
import { selfhostedAuth, SelfhostedUser } from "./selfhosted-auth";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<SelfhostedUser | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (selfhostedAuth.isAuthenticated()) {
        const userData = await selfhostedAuth.getMe();
        if (userData) {
          setUser(userData);
          setOrgId(
            selfhostedAuth.getCurrentOrganizationId() ||
              userData.organizations[0]?.id ||
              null
          );
        }
      }
      setIsLoaded(true);
    };

    checkAuth();
  }, []);

  const signOut = useCallback(async () => {
    await selfhostedAuth.logout();
    setUser(null);
    setOrgId(null);
    window.location.href = "/sign-in";
  }, []);

  const getToken = useCallback(async () => {
    return selfhostedAuth.getToken();
  }, []);

  const value: AuthContextValue = {
    isLoaded,
    isSignedIn: !!user,
    userId: user?.id || null,
    orgId,
    userEmail: user?.email || null,
    userName: user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
      : null,
    getToken,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

export function useSelfhostedAuth() {
  return {
    login: selfhostedAuth.login.bind(selfhostedAuth),
    register: selfhostedAuth.register.bind(selfhostedAuth),
    logout: selfhostedAuth.logout.bind(selfhostedAuth),
    switchOrganization: selfhostedAuth.switchOrganization.bind(selfhostedAuth),
  };
}
