"use client";

import { useState } from "react";
import { Lightbulb, ArrowRight, Check } from "lucide-react";

const useCases = [
  {
    id: "code-review",
    title: "Automated Code Review",
    subtitle: "MR Created → AI Review → Security Scan → Post Comment",
    description:
      "When a merge request is created, AI analyzes the code, checks for security issues, suggests improvements, and posts a detailed review comment automatically.",
    benefits: [
      "Instant feedback on every MR",
      "Consistent code quality standards",
      "Security vulnerabilities detected early",
      "Time savings for senior developers",
    ],
  },
  {
    id: "task-to-code",
    title: "Task-to-Code Automation",
    subtitle: "JIRA Ticket → AI Analysis → Create Branch → Implement → Open MR",
    description:
      "Label a JIRA ticket with 'AI' and watch as AI reads the task, estimates effort, creates a branch, implements the changes, and opens a merge request.",
    benefits: [
      "Automatic implementation of simple tasks",
      "Consistent branch naming and commits",
      "Instant MR with full context",
      "Human review before merge",
    ],
  },
  {
    id: "sprint-planning",
    title: "Smart Sprint Planning",
    subtitle: "Schedule → Fetch Backlog → AI Analyze → Update JIRA",
    description:
      "At sprint start, AI analyzes backlog items, suggests story points, identifies dependencies, and creates a recommended sprint based on team velocity.",
    benefits: [
      "Data-driven story point estimation",
      "Automatic dependency detection",
      "Balanced sprint workload",
      "Historical velocity analysis",
    ],
  },
  {
    id: "doc-sync",
    title: "Documentation Sync",
    subtitle: "MR Merged → AI Summary → Update Docs → Notify Team",
    description:
      "When code changes are merged, AI updates relevant documentation, API specs, and sends a summary to the team Slack channel.",
    benefits: [
      "Always up-to-date documentation",
      "Automatic changelog generation",
      "Team stays informed of changes",
      "No manual doc updates needed",
    ],
  },
];

export function UseCases() {
  const [activeCase, setActiveCase] = useState(useCases[0]);

  return (
    <section id="use-cases" className="py-16 sm:py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm mb-4">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="font-medium">Use Cases</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Built for real workflows
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            See how teams automate their development lifecycle
          </p>
        </div>

        {/* Tabs and Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Tab Navigation */}
          <div className="lg:col-span-1 space-y-2">
            {useCases.map((useCase) => (
              <button
                key={useCase.id}
                onClick={() => setActiveCase(useCase)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                  activeCase.id === useCase.id
                    ? "bg-card border-2 border-primary"
                    : "bg-card/50 border border-border hover:bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm sm:text-base">
                    {useCase.title}
                  </span>
                  <ArrowRight
                    className={`w-4 h-4 transition-all duration-200 ${
                      activeCase.id === useCase.id
                        ? "translate-x-0 opacity-100 text-primary"
                        : "-translate-x-2 opacity-0"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Content Panel */}
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute -inset-1 bg-primary/5 rounded-2xl blur-xl" />
              <div className="relative bg-card border border-border rounded-2xl p-6 sm:p-8">
                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">
                    {activeCase.title}
                  </h3>
                  <div className="text-sm text-muted-foreground font-mono bg-muted/50 px-3 py-2 rounded-lg overflow-x-auto">
                    {activeCase.subtitle}
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {activeCase.description}
                </p>

                {/* Benefits */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Benefits
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activeCase.benefits.map((benefit) => (
                      <div key={benefit} className="flex items-start gap-2">
                        <Check className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold mb-2">Three simple steps</h3>
            <p className="text-sm text-muted-foreground">
              Get started in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Connect Your Tools",
                description:
                  "Link JIRA, GitLab, Slack, and AI provider with one-click OAuth.",
              },
              {
                step: "02",
                title: "Build Your Workflow",
                description:
                  "Drag and drop blocks. Set triggers, conditions, and actions.",
              },
              {
                step: "03",
                title: "Let AI Work",
                description:
                  "Activate and let AI process tasks in the background automatically.",
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl h-full hover:border-primary/50 transition-colors">
                  <div className="text-4xl font-bold text-primary/20 mb-4">
                    {item.step}
                  </div>
                  <h4 className="text-lg font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
