"use client";

import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useOrganization as useClerkOrganization,
} from "@clerk/nextjs";
import { useAuthContext } from "./auth-context";
import { LocalUser, LocalOrganization, LocalMembership } from "./types";

const LOCAL_USER_ID = "local_anonymous";
const LOCAL_ORG_ID = "local_default";

/**
 * Universal useAuth hook - works in Local, Selfhosted, and Clerk mode.
 */
export function useAuth() {
  const context = useAuthContext();

  // Local and selfhosted modes use context directly
  if (context.isLocalMode || context.isSelfhostedMode) {
    return {
      isLoaded: context.isLoaded,
      isSignedIn: context.isSignedIn,
      userId: context.userId,
      orgId: context.orgId,
      getToken: context.getToken,
      signOut: context.signOut,
    };
  }

  // In Clerk mode, we need the actual Clerk hook
  // This is a workaround - the component using this must be within ClerkProvider
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerkAuth = useClerkAuth();
  return {
    isLoaded: clerkAuth.isLoaded,
    isSignedIn: clerkAuth.isSignedIn ?? false,
    userId: clerkAuth.userId ?? null,
    orgId: clerkAuth.orgId ?? null,
    getToken: clerkAuth.getToken,
    signOut: clerkAuth.signOut,
  };
}

/**
 * Universal useUser hook - works in Local, Selfhosted, and Clerk mode.
 */
export function useUser() {
  const context = useAuthContext();

  if (context.isLocalMode) {
    const localUser: LocalUser = {
      id: LOCAL_USER_ID,
      firstName: "Local",
      lastName: "User",
      emailAddresses: [{ emailAddress: "local@localhost" }],
      imageUrl: null,
    };

    return {
      isLoaded: true,
      isSignedIn: true,
      user: localUser,
    };
  }

  if (context.isSelfhostedMode) {
    // In selfhosted mode, user data comes from context
    const userName = context.userName?.split(" ") || [];
    const selfhostedUser: LocalUser = {
      id: context.userId || "",
      firstName: userName[0] || null,
      lastName: userName.slice(1).join(" ") || null,
      emailAddresses: context.userEmail
        ? [{ emailAddress: context.userEmail }]
        : [],
      imageUrl: null,
    };

    return {
      isLoaded: context.isLoaded,
      isSignedIn: context.isSignedIn,
      user: context.isSignedIn ? selfhostedUser : null,
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerkUser = useClerkUser();
  return {
    isLoaded: clerkUser.isLoaded,
    isSignedIn: clerkUser.isSignedIn ?? false,
    user: clerkUser.user,
  };
}

/**
 * Universal useOrganization hook - works in both Local and Clerk mode.
 */
export function useOrganization(options?: {
  memberships?: { infinite: boolean };
  invitations?: { infinite: boolean };
}) {
  const context = useAuthContext();

  if (context.isLocalMode) {
    const localOrg: LocalOrganization = {
      id: LOCAL_ORG_ID,
      name: "Local Organization",
      slug: "local",
      imageUrl: null,
    };

    const localMembership: LocalMembership = {
      id: "local_membership",
      role: "org:admin",
      publicUserData: {
        userId: LOCAL_USER_ID,
        firstName: "Local",
        lastName: "User",
        identifier: "local@localhost",
        imageUrl: null,
      },
      createdAt: new Date(),
    };

    return {
      isLoaded: true,
      organization: localOrg,
      membership: localMembership,
      memberships: options?.memberships
        ? {
            data: [localMembership],
            revalidate: async () => {},
          }
        : undefined,
      invitations: options?.invitations
        ? {
            data: [],
            revalidate: async () => {},
          }
        : undefined,
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerkOrg = useClerkOrganization(options);
  return clerkOrg;
}
