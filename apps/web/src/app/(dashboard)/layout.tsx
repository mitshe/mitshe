import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { OnboardingTour } from "@/components/onboarding-tour";
import { BreadcrumbsWrapper } from "@/components/layout/breadcrumbs-wrapper";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto">
          <BreadcrumbsWrapper />
          {children}
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
}
