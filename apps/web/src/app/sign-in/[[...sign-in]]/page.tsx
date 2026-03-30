import { SignIn } from "@clerk/nextjs";
import { SelfhostedAuthPage } from "@/components/auth/selfhosted-auth-page";

const authMode =
  process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || "selfhosted";

export default function SignInPage() {
  if (authMode === "clerk") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SignIn />
      </div>
    );
  }

  return <SelfhostedAuthPage />;
}
