"use client";

import {
  Workflow,
  Brain,
  GitBranch,
  Clock,
  Shield,
  Zap,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    description:
      "Drag and drop to create automations. No code required. Connect any tool in seconds.",
    size: "large",
  },
  {
    icon: Brain,
    title: "AI Task Analysis",
    description:
      "AI analyzes tasks, estimates effort, and suggests implementation approaches.",
    size: "large",
  },
  {
    icon: GitBranch,
    title: "Automated Git",
    description: "Create branches, commits, and merge requests automatically.",
    size: "small",
  },
  {
    icon: Clock,
    title: "Background Jobs",
    description: "Tasks run in background. Get notified when done.",
    size: "small",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "BYOK for AI. Your keys stay encrypted. SOC 2 compliant.",
    size: "small",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description: "Pre-built connectors for all your favorite tools.",
    size: "small",
  },
];

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium">Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Everything you need to
            <br />
            automate development
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From task analysis to deployment — build workflows that handle your
            entire lifecycle.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group relative rounded-2xl bg-card border border-border p-6 hover:border-primary/50 transition-all duration-300 ${
                feature.size === "large" ? "lg:col-span-2" : ""
              }`}
            >
              <div className="relative">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-base font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
