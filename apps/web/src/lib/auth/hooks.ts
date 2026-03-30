"use client";

import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useOrganization as useClerkOrganization,
} from "@clerk/nextjs";
import { useAuthContext } from "./auth-context";
import { LocalUser, LocalOrganization, LocalMembership } from "./types";

/**
 * Universal useAuth hook - works in Selfhosted and Clerk mode.
 */
export function useAuth() {
  const context = useAuthContext();

  if (context.isSelfhostedMode) {
    return {
      isLoaded: context.isLoaded,
      isSignedIn: context.isSignedIn,
      userId: context.userId,
      orgId: context.orgId,
      getToken: context.getToken,
      signOut: context.signOut,
    };
  }

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
 * Universal useUser hook - works in Selfhosted and Clerk mode.
 */
export function useUser() {
  const context = useAuthContext();

  if (context.isSelfhostedMode) {
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
 * Universal useOrganization hook - works in Selfhosted and Clerk mode.
 */
export function useOrganization(options?: {
  memberships?: { infinite: boolean };
  invitations?: { infinite: boolean };
}) {
  const context = useAuthContext();

  if (context.isSelfhostedMode) {
    const org: LocalOrganization = {
      id: context.orgId || "",
      name: context.userName ? `${context.userName}'s Workspace` : "Workspace",
      slug: null,
      imageUrl: null,
    };

    const membership: LocalMembership = {
      id: "self_membership",
      role: "org:admin",
      publicUserData: {
        userId: context.userId || "",
        firstName: context.userName?.split(" ")[0] || null,
        lastName: context.userName?.split(" ").slice(1).join(" ") || null,
        identifier: context.userEmail || "",
        imageUrl: null,
      },
      createdAt: new Date(),
    };

    return {
      isLoaded: context.isLoaded,
      organization: context.isSignedIn ? org : null,
      membership: context.isSignedIn ? membership : null,
      memberships: options?.memberships
        ? {
            data: context.isSignedIn ? [membership] : [],
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
