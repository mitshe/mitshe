"use client";

import { useMemo } from "react";
import { useAuthContext } from "./auth-context";
import { LocalUser, LocalOrganization, LocalMembership } from "./types";

const SELFHOSTED_MEMBERSHIP_EPOCH = new Date("2024-01-01T00:00:00Z");

export function useAuth() {
  const context = useAuthContext();

  return useMemo(
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
}

export function useUser() {
  const context = useAuthContext();

  return useMemo(() => {
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
}

export function useOrganization(options?: {
  memberships?: { infinite: boolean };
  invitations?: { infinite: boolean };
}) {
  const context = useAuthContext();
  const hasMemberships = !!options?.memberships;
  const hasInvitations = !!options?.invitations;

  return useMemo(() => {
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
}
