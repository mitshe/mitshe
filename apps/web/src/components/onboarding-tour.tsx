"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_COMPLETED_KEY = "onboarding-tour-completed";

const tourSteps: DriveStep[] = [
  {
    element: "[data-tour='dashboard']",
    popover: {
      title: "Welcome to mitshe!",
      description:
        "This is your dashboard - the central hub for monitoring your AI-powered workflow automation. Let's take a quick tour!",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='getting-started']",
    popover: {
      title: "Getting Started Checklist",
      description:
        "Follow these steps to set up your workspace. Connect integrations, sync repositories, and create your first workflow.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "[data-tour='nav-tasks']",
    popover: {
      title: "Tasks",
      description:
        "View and manage all your tasks here. Tasks can be imported from integrated issue trackers or created manually.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-workflows']",
    popover: {
      title: "Workflows",
      description:
        "Create powerful automation workflows with our visual builder. Connect triggers, AI actions, and integrations.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-integrations']",
    popover: {
      title: "Integrations",
      description:
        "Connect your tools: JIRA, GitLab, GitHub, Slack, and more. This is the first step to automate your workflow.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-ai']",
    popover: {
      title: "AI Providers (BYOK)",
      description:
        "Add your own API keys for Claude, OpenAI, or other AI providers. Your keys are encrypted and never logged.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='user-menu']",
    popover: {
      title: "Your Account",
      description:
        "Access your profile, organization settings, and sign out from here. You're all set to get started!",
      side: "bottom",
      align: "end",
    },
  },
];

export function OnboardingTour() {
  const pathname = usePathname();
  const [shouldShowTour, setShouldShowTour] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY) === "true";
    setShouldShowTour(!completed);
  }, []);

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    if (!shouldShowTour) return;

    const timer = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        steps: tourSteps,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        progressText: "{{current}} of {{total}}",
        popoverClass: "onboarding-popover",
        onDestroyed: () => {
          localStorage.setItem(TOUR_COMPLETED_KEY, "true");
          setShouldShowTour(false);
        },
      });

      driverObj.drive();
    }, 800);

    return () => clearTimeout(timer);
  }, [shouldShowTour, pathname]);

  return null;
}

export function resetOnboardingTour() {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
}
