"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { JiraIcon, GitLabIcon, SlackIcon, ClaudeIcon } from "./icons";
import { ShaderBackground } from "./shader-background";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Shader Background */}
      <div className="absolute inset-0 opacity-90 sm:opacity-40">
        <ShaderBackground variant="hero" />
      </div>

      {/* Gradient overlay - only at edges for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-background/80" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-24 sm:pt-28 pb-12">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm mb-8 animate-fade-in">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-medium">AI-Powered Workflow Automation</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5 animate-fade-in">
          <span className="block">Automate Your</span>
          <span className="block text-primary">Development Workflow</span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 animate-fade-in">
          Connect JIRA, GitLab, Slack and AI. Build automations visually. Let AI
          handle the rest.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 animate-fade-in">
          <Link href="/sign-up">
            <Button
              size="lg"
              className="h-12 px-8 text-base font-medium shadow-lg shadow-primary/25"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/docs">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base font-medium"
            >
              Documentation
            </Button>
          </Link>
        </div>

        {/* Workflow Preview Card */}
        <div className="relative max-w-3xl mx-auto animate-fade-in">
          <div className="absolute -inset-1 bg-primary/10 rounded-2xl blur-xl" />
          <div className="relative bg-card border border-border rounded-xl overflow-hidden">
            {/* Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                Workflow
              </span>
            </div>

            {/* Workflow Content */}
            <div className="p-5 sm:p-8">
              <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                <WorkflowNode
                  icon={<JiraIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
                  label="Trigger"
                />
                <ConnectionLine />
                <WorkflowNode
                  icon={<ClaudeIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
                  label="AI"
                />
                <ConnectionLine />
                <WorkflowNode
                  icon={<GitLabIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
                  label="Action"
                />
                <ConnectionLine />
                <WorkflowNode
                  icon={<SlackIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
                  label="Notify"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowNode({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg border border-border bg-card flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] sm:text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function ConnectionLine() {
  return <div className="hidden sm:block w-6 h-px bg-border" />;
}
