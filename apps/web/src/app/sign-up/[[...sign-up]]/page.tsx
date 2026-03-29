import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SelfhostedSignUp } from "@/components/auth";

// Determine auth mode
const authMode =
  process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || "clerk";

export default function SignUpPage() {
  // In local mode, redirect to dashboard (no auth needed)
  if (authMode === "local") {
    redirect("/dashboard");
  }

  // In selfhosted mode, show custom sign-up form
  if (authMode === "selfhosted") {
    return <SelfhostedSignUp />;
  }

  // In Clerk mode, show Clerk sign-up
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <SignUp />
        <p className="text-xs text-muted-foreground text-center max-w-sm px-4">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
