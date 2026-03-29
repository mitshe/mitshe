/**
 * Authentication abstraction layer.
 * Supports Clerk mode, Selfhosted mode (JWT), and Local mode (anonymous).
 */

export { AuthProvider, useAuthContext, useSelfhostedAuth } from "./auth-context";
export { useAuth, useOrganization, useUser } from "./hooks";
export { selfhostedAuth } from "./selfhosted-auth";
export type {
  AuthContextValue,
  AuthMode,
  LocalUser,
  LocalOrganization,
} from "./types";
export type { SelfhostedUser, AuthTokens } from "./selfhosted-auth";
