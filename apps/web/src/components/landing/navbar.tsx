"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, ArrowRight } from "lucide-react";
import { useAuthContext } from "@/lib/auth";

// Dynamically import Clerk components
const SignedIn = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignedIn),
  { ssr: false }
);
const SignedOut = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignedOut),
  { ssr: false }
);
const SignOutButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.SignOutButton),
  { ssr: false }
);

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#integrations", label: "Integrations" },
  { href: "#use-cases", label: "Use Cases" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLocalMode } = useAuthContext();

  // In local mode, show simplified navbar (user is always "signed in")
  const renderAuthButtons = () => {
    if (isLocalMode) {
      return (
        <Link href="/tasks">
          <Button
            size="sm"
            className="group bg-foreground text-background hover:bg-foreground/90"
          >
            Go to App
            <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </Button>
        </Link>
      );
    }

    return (
      <>
        <SignedOut>
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Get Started
            </Button>
          </Link>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard">
            <Button
              size="sm"
              className="group bg-foreground text-background hover:bg-foreground/90"
            >
              Dashboard
              <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </Button>
          </Link>
          <SignOutButton>
            <Button variant="ghost" size="sm">
              Sign Out
            </Button>
          </SignOutButton>
        </SignedIn>
      </>
    );
  };

  const renderMobileAuthButtons = () => {
    if (isLocalMode) {
      return (
        <Link href="/tasks" className="block">
          <Button
            size="sm"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
          >
            Go to App
          </Button>
        </Link>
      );
    }

    return (
      <>
        <SignedOut>
          <Link href="/sign-in" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up" className="block">
            <Button
              size="sm"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
            >
              Get Started
            </Button>
          </Link>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className="block">
            <Button
              size="sm"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
            >
              Dashboard
            </Button>
          </Link>
          <SignOutButton>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Sign Out
            </Button>
          </SignOutButton>
        </SignedIn>
      </>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-semibold text-lg">
          mitshe
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {renderAuthButtons()}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 -mr-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-border">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border space-y-3">
              {renderMobileAuthButtons()}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
