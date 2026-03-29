"use client";

import { Plug } from "lucide-react";
import {
  JiraIcon,
  GitLabIcon,
  GitHubIcon,
  SlackIcon,
  YouTrackIcon,
  ObsidianIcon,
  ClaudeIcon,
  OpenAIIcon,
  TeamsIcon,
  LinearIcon,
  WebhookIcon,
  APIIcon,
} from "./icons";

const integrationGroups = [
  {
    label: "Project Management",
    items: [
      { name: "JIRA", icon: JiraIcon },
      { name: "YouTrack", icon: YouTrackIcon },
      { name: "Linear", icon: LinearIcon },
    ],
  },
  {
    label: "Version Control",
    items: [
      { name: "GitLab", icon: GitLabIcon },
      { name: "GitHub", icon: GitHubIcon },
    ],
  },
  {
    label: "Communication",
    items: [
      { name: "Slack", icon: SlackIcon },
      { name: "Teams", icon: TeamsIcon },
    ],
  },
  {
    label: "AI Providers",
    items: [
      { name: "Claude", icon: ClaudeIcon },
      { name: "OpenAI", icon: OpenAIIcon },
    ],
  },
  {
    label: "Custom",
    items: [
      { name: "Webhooks", icon: WebhookIcon },
      { name: "REST API", icon: APIIcon },
      { name: "Obsidian", icon: ObsidianIcon },
    ],
  },
];

export function Integrations() {
  return (
    <section id="integrations" className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm mb-4">
            <Plug className="w-4 h-4 text-primary" />
            <span className="font-medium">Integrations</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Connect your stack
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Seamless integration with the tools you already use
          </p>
        </div>

        {/* Integration Groups - Horizontal Rows */}
        <div className="space-y-8">
          {integrationGroups.map((group) => (
            <div
              key={group.label}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              {/* Label */}
              <div className="sm:w-40 shrink-0">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
              </div>

              {/* Icons Row */}
              <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                {group.items.map((item) => (
                  <div
                    key={item.name}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon - Minimal */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground">Coming soon:</span> Notion,
            Confluence, Asana, Monday.com
          </p>
        </div>
      </div>
    </section>
  );
}
