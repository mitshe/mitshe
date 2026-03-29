"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-white p-6">
          <div className="max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-zinc-100 p-4">
                <AlertCircle className="h-8 w-8 text-zinc-600" />
              </div>
            </div>

            <h2 className="mb-2 text-xl font-semibold text-zinc-900">
              Something went wrong
            </h2>
            <p className="mb-6 text-zinc-600">
              A critical error occurred. Please refresh the page.
            </p>

            <button
              onClick={reset}
              className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
