import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
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

const spaceGrotesk = Space_Grotesk({
  variable: "--font-brand",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mitshe - AI Workflow Automation",
  description: "AI-powered workflow automation platform",
};

function getAuthMode(): AuthMode {
  const mode =
    process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || "selfhosted";
  return mode === "clerk" ? "clerk" : "selfhosted";
}

const authMode = getAuthMode();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider authMode={authMode}>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
          suppressHydrationWarning
        >
          <Providers>{children}</Providers>
          <Toaster />
        </body>
      </html>
    </AuthProvider>
  );
}
