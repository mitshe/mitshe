"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { BreadcrumbsWrapper } from "./breadcrumbs-wrapper";
import { OnboardingTour } from "@/components/onboarding-tour";
import { ThreadNotifications } from "@/components/thread-notifications";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-muted/30">
      <div className="hidden md:flex p-2 pr-0 shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto relative">
          <BreadcrumbsWrapper />
          {children}
        </main>
      </div>
      <OnboardingTour />
      <ThreadNotifications />
    </div>
  );
}
