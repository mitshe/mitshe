"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/nextjs";
import { AuthContextValue, AuthMode } from "./types";
import { selfhostedAuth, SelfhostedUser } from "./selfhosted-auth";

const LOCAL_USER_ID = "local_anonymous";
const LOCAL_ORG_ID = "local_default";

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Local mode auth provider - no authentication required.
 */
function LocalAuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    authMode: "local",
    isLocalMode: true,
    isSelfhostedMode: false,
    isClerkMode: false,
    isLoaded: true,
    isSignedIn: true,
    userId: LOCAL_USER_ID,
    orgId: LOCAL_ORG_ID,
    userEmail: "local@localhost",
    userName: "Local User",
    getToken: async () => null,
    signOut: async () => {
      // No-op in local mode
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Selfhosted mode auth provider - JWT-based authentication.
 */
function SelfhostedAuthProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<SelfhostedUser | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Check auth status on mount
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
    // Redirect to login
    window.location.href = "/sign-in";
  }, []);

  const getToken = useCallback(async () => {
    return selfhostedAuth.getToken();
  }, []);

  const value: AuthContextValue = {
    authMode: "selfhosted",
    isLocalMode: false,
    isSelfhostedMode: true,
    isClerkMode: false,
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

/**
 * Clerk mode auth provider - wraps children with ClerkProvider.
 */
function ClerkAuthProviderInner({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, orgId, getToken, signOut } =
    useClerkAuth();

  const value: AuthContextValue = {
    authMode: "clerk",
    isLocalMode: false,
    isSelfhostedMode: false,
    isClerkMode: true,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId: userId ?? null,
    orgId: orgId ?? null,
    userEmail: null, // Clerk doesn't expose email directly in useAuth
    userName: null,
    getToken: async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    },
    signOut: async () => {
      await signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Main auth provider that switches between Local, Selfhosted, and Clerk mode.
 */
export function AuthProvider({
  children,
  authMode,
}: {
  children: ReactNode;
  authMode: AuthMode;
}) {
  if (authMode === "local") {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }

  if (authMode === "selfhosted") {
    return <SelfhostedAuthProvider>{children}</SelfhostedAuthProvider>;
  }

  // Clerk mode
  return (
    <ClerkProvider>
      <ClerkAuthProviderInner>{children}</ClerkAuthProviderInner>
    </ClerkProvider>
  );
}

/**
 * Hook to access auth context.
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

/**
 * Hook for selfhosted auth operations (login, register, etc.)
 * Only available in selfhosted mode.
 */
export function useSelfhostedAuth() {
  const context = useAuthContext();

  if (!context.isSelfhostedMode) {
    throw new Error("useSelfhostedAuth is only available in selfhosted mode");
  }

  return {
    login: selfhostedAuth.login.bind(selfhostedAuth),
    register: selfhostedAuth.register.bind(selfhostedAuth),
    logout: selfhostedAuth.logout.bind(selfhostedAuth),
    switchOrganization: selfhostedAuth.switchOrganization.bind(selfhostedAuth),
  };
}
