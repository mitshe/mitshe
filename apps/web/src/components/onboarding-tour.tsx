"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_COMPLETED_KEY = "onboarding-tour-completed";

const tourSteps: DriveStep[] = [
  {
    popover: {
      title: "Welcome to mitshe!",
      description:
        "Your workspace for AI coding agents. Each task gets its own isolated thread with terminal, browser, and Claude Code. Let's take a quick tour!",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "[data-tour='nav-sessions']",
    popover: {
      title: "Threads",
      description:
        "Isolated Docker containers where AI agents work on your code. Start a thread, watch Claude Code implement, test, and review.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-workflows']",
    popover: {
      title: "Workflows",
      description:
        "Automate repetitive tasks: Jira ticket arrives → thread opens → Claude works → you review the PR.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-tasks']",
    popover: {
      title: "Tasks",
      description:
        "Import tasks from Jira or create them manually. Each task can be opened in its own thread.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='user-menu']",
    popover: {
      title: "Settings & Account",
      description:
        "Connect your AI provider (bring your own key), add integrations, and manage your workspace from Settings.",
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
    if (pathname !== "/chat") return;
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
