import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-brand" });

export const metadata: Metadata = {
  title: "mitshe - Workspace Manager for AI Coding Agents",
  description:
    "Self-hosted workspace manager for AI coding agents. Isolated Docker sessions with terminal, browser, and git for Claude Code.",
  openGraph: {
    title: "mitshe - Workspace Manager for AI Coding Agents",
    description:
      "Give Claude Code an isolated workspace with terminal, browser, and git. Snapshot environments, automate with workflows. Self-hosted.",
    url: "https://mitshe.com",
    siteName: "mitshe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "mitshe - Workspace Manager for AI Coding Agents",
    description:
      "Self-hosted workspace manager for AI coding agents. One Docker command to start.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>{children}</body>
    </html>
  );
}
