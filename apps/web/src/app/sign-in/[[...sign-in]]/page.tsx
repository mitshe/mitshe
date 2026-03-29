import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { SelfhostedSignIn } from "@/components/auth";

// Determine auth mode
const authMode =
  process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || "clerk";

export default function SignInPage() {
  // In local mode, redirect to dashboard (no auth needed)
  if (authMode === "local") {
    redirect("/dashboard");
  }

  // In selfhosted mode, show custom sign-in form
  if (authMode === "selfhosted") {
    return <SelfhostedSignIn />;
  }

  // In Clerk mode, show Clerk sign-in
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
