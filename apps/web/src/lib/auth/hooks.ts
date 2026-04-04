"use client";

import { useMemo } from "react";
import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useOrganization as useClerkOrganization,
} from "@clerk/nextjs";
import { useAuthContext } from "./auth-context";
import { LocalUser, LocalOrganization, LocalMembership } from "./types";

const SELFHOSTED_MEMBERSHIP_EPOCH = new Date("2024-01-01T00:00:00Z");

/**
 * Universal useAuth hook - works in Selfhosted and Clerk mode.
 */
export function useAuth() {
  const context = useAuthContext();

  const selfhostedValue = useMemo(
    () => ({
      isLoaded: context.isLoaded,
      isSignedIn: context.isSignedIn,
      userId: context.userId,
      orgId: context.orgId,
      getToken: context.getToken,
      signOut: context.signOut,
    }),
    [
      context.isLoaded,
      context.isSignedIn,
      context.userId,
      context.orgId,
      context.getToken,
      context.signOut,
    ],
  );

  if (context.isSelfhostedMode) {
    return selfhostedValue;
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

  const selfhostedValue = useMemo(() => {
    const userName = context.userName?.split(" ") || [];
    const user: LocalUser = {
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
      user: context.isSignedIn ? user : null,
    };
  }, [
    context.isLoaded,
    context.isSignedIn,
    context.userId,
    context.userName,
    context.userEmail,
  ]);

  if (context.isSelfhostedMode) {
    return selfhostedValue;
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
  const hasMemberships = !!options?.memberships;
  const hasInvitations = !!options?.invitations;

  const selfhostedValue = useMemo(() => {
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
      createdAt: SELFHOSTED_MEMBERSHIP_EPOCH,
    };

    return {
      isLoaded: context.isLoaded,
      organization: context.isSignedIn ? org : null,
      membership: context.isSignedIn ? membership : null,
      memberships: hasMemberships
        ? {
            data: context.isSignedIn ? [membership] : [],
            revalidate: async () => {},
          }
        : undefined,
      invitations: hasInvitations
        ? {
            data: [],
            revalidate: async () => {},
          }
        : undefined,
    };
  }, [
    context.isLoaded,
    context.isSignedIn,
    context.orgId,
    context.userId,
    context.userName,
    context.userEmail,
    hasMemberships,
    hasInvitations,
  ]);

  if (context.isSelfhostedMode) {
    return selfhostedValue;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerkOrg = useClerkOrganization(options);
  return clerkOrg;
}
