import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";

const authMode =
  process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || "selfhosted";

export default function SignUpPage() {
  if (authMode === "clerk") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SignUp />
      </div>
    );
  }

  // In selfhosted mode, sign-up is handled on the sign-in page (first user setup)
  redirect("/sign-in");
}
