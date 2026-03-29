import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/cookie-consent";
import type { AuthMode } from "@/lib/auth/types";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mitshe - AI Workflow Automation",
  description: "AI-powered workflow automation platform",
};

// Determine auth mode from environment
function getAuthMode(): AuthMode {
  const authMode =
    process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || "clerk";

  if (authMode === "local") return "local";
  if (authMode === "selfhosted") return "selfhosted";
  return "clerk";
}

const authMode = getAuthMode();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider authMode={authMode}>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <Providers>{children}</Providers>
          <Toaster />
          {authMode === "clerk" && <CookieConsent />}
        </body>
      </html>
    </AuthProvider>
  );
}
