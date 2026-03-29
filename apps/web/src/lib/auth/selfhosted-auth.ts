"use client";

// Types for selfhosted auth
export interface SelfhostedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  organizations: {
    id: string;
    name: string;
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  }[];
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: SelfhostedUser;
  accessToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  user: SelfhostedUser;
  accessToken: string;
  expiresIn: number;
}

// Token storage keys
const ACCESS_TOKEN_KEY = "mitshe_access_token";
const TOKEN_EXPIRY_KEY = "mitshe_token_expiry";
const CURRENT_ORG_KEY = "mitshe_current_org";

/**
 * Selfhosted auth service - manages JWT tokens and auth state
 */
class SelfhostedAuthService {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    // Load token from storage on init (client-side only)
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
      this.tokenExpiry = expiry ? parseInt(expiry, 10) : null;
    }
  }

  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    organizationName?: string;
  }): Promise<RegisterResponse> {
    const response = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Registration failed");
    }

    const result = await response.json();
    this.setTokens(result.accessToken, result.expiresIn);

    // Store first org as current
    if (result.user.organizations.length > 0) {
      this.setCurrentOrganization(result.user.organizations[0].id);
    }

    return result;
  }

  /**
   * Login with email and password
   */
  async login(data: {
    email: string;
    password: string;
    organizationId?: string;
  }): Promise<LoginResponse> {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const result = await response.json();
    this.setTokens(result.accessToken, result.expiresIn);

    // Store first org as current (or the one user specified)
    const orgId =
      data.organizationId ||
      result.user.organizations.find(
        (o: { role: string }) => o.role === "OWNER"
      )?.id ||
      result.user.organizations[0]?.id;
    if (orgId) {
      this.setCurrentOrganization(orgId);
    }

    return result;
  }

  /**
   * Logout - clears tokens and calls backend
   */
  async logout(): Promise<void> {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {},
      });
    } catch {
      // Ignore errors - we're logging out anyway
    }

    this.clearTokens();
  }

  /**
   * Get current access token, refreshing if needed
   */
  async getToken(): Promise<string | null> {
    // Check if token is still valid (with 30s buffer)
    if (this.accessToken && this.tokenExpiry) {
      const now = Date.now();
      if (now < this.tokenExpiry - 30000) {
        return this.accessToken;
      }
    }

    // Need to refresh
    return this.refreshToken();
  }

  /**
   * Refresh access token using refresh token cookie
   */
  private async refreshToken(): Promise<string | null> {
    // Avoid multiple concurrent refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async doRefresh(): Promise<string | null> {
    try {
      const response = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const result = await response.json();
      this.setTokens(result.accessToken, result.expiresIn);
      return result.accessToken;
    } catch {
      this.clearTokens();
      return null;
    }
  }

  /**
   * Switch to a different organization
   */
  async switchOrganization(organizationId: string): Promise<void> {
    const response = await fetch("/api/v1/auth/switch-organization", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      credentials: "include",
      body: JSON.stringify({ organizationId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to switch organization");
    }

    const result = await response.json();
    this.setTokens(result.accessToken, result.expiresIn);
    this.setCurrentOrganization(organizationId);
  }

  /**
   * Get current user info
   */
  async getMe(): Promise<SelfhostedUser | null> {
    const token = await this.getToken();
    if (!token) {
      return null;
    }

    try {
      const response = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.accessToken || !this.tokenExpiry) {
      return false;
    }
    return Date.now() < this.tokenExpiry;
  }

  /**
   * Get current organization ID
   */
  getCurrentOrganizationId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CURRENT_ORG_KEY);
  }

  /**
   * Set current organization ID
   */
  setCurrentOrganization(orgId: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_ORG_KEY, orgId);
    }
  }

  // Private helpers
  private setTokens(accessToken: string, expiresIn: number): void {
    this.accessToken = accessToken;
    this.tokenExpiry = Date.now() + expiresIn * 1000;

    if (typeof window !== "undefined") {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(TOKEN_EXPIRY_KEY, this.tokenExpiry.toString());
    }
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.tokenExpiry = null;

    if (typeof window !== "undefined") {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      localStorage.removeItem(CURRENT_ORG_KEY);
    }
  }
}

// Singleton instance
export const selfhostedAuth = new SelfhostedAuthService();
