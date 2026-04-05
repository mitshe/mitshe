import { AuthGuard } from "@/components/auth";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">{children}</div>
    </AuthGuard>
  );
}
