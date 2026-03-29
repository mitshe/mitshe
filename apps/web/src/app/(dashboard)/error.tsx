"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-zinc-100 p-4">
            <AlertCircle className="h-8 w-8 text-zinc-600" />
          </div>
        </div>

        <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-6 text-muted-foreground">
          An unexpected error occurred. Please try again or return to the
          dashboard.
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 rounded-lg border bg-zinc-50 p-4 text-left">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Error details:
            </p>
            <p className="text-sm font-mono text-zinc-700 break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-zinc-400">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
