/**
 * Types for the authentication abstraction layer.
 */

export interface LocalUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: { emailAddress: string }[];
  imageUrl: string | null;
}

export interface LocalOrganization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string | null;
}

export interface LocalMembership {
  id: string;
  role: "org:admin" | "org:member";
  publicUserData: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    identifier: string;
    imageUrl: string | null;
  };
  createdAt: Date;
}

export type AuthMode = "selfhosted" | "clerk";

export interface AuthContextValue {
  authMode: AuthMode;
  isSelfhostedMode: boolean;
  isClerkMode: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  orgId: string | null;
  userEmail: string | null;
  userName: string | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}
