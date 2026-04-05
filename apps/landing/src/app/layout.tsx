import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mitshe - AI Workflow Automation",
  description:
    "Open-source AI-powered workflow automation. Connect Jira, GitHub, Slack and let AI handle repetitive development tasks.",
  openGraph: {
    title: "mitshe - AI Workflow Automation",
    description:
      "Open-source AI-powered workflow automation. Connect your tools, build workflows visually, let AI do the work.",
    url: "https://mitshe.com",
    siteName: "mitshe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "mitshe - AI Workflow Automation",
    description:
      "Open-source AI-powered workflow automation platform. Self-host with one command.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
