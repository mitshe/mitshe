"use client";

import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { BreadcrumbsWrapper } from "./breadcrumbs-wrapper";
import { OnboardingTour } from "@/components/onboarding-tour";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto relative">
          <BreadcrumbsWrapper />
          {children}
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
}
