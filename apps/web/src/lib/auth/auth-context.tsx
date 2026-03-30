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

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Selfhosted mode auth provider - JWT-based authentication.
 */
function SelfhostedAuthProvider({ children }: { children: ReactNode }) {
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
    authMode: "selfhosted",
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
    isSelfhostedMode: false,
    isClerkMode: true,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId: userId ?? null,
    orgId: orgId ?? null,
    userEmail: null,
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
 * Main auth provider that switches between Selfhosted and Clerk mode.
 */
export function AuthProvider({
  children,
  authMode,
}: {
  children: ReactNode;
  authMode: AuthMode;
}) {
  if (authMode === "selfhosted") {
    return <SelfhostedAuthProvider>{children}</SelfhostedAuthProvider>;
  }

  // Clerk mode - only render if publishable key is available
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkKey) {
    return <SelfhostedAuthProvider>{children}</SelfhostedAuthProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
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
