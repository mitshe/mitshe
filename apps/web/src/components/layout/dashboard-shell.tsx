"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { BreadcrumbsWrapper } from "./breadcrumbs-wrapper";
import { OnboardingTour } from "@/components/onboarding-tour";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
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
