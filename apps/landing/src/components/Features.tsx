"use client";

import { useEffect, useState } from "react";
import AnimateOnScroll from "./AnimateOnScroll";

/* ── Workflow Builder Mockup ── */
function WorkflowMockup() {
  const [activeNode, setActiveNode] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setActiveNode((prev) => (prev + 1) % 4), 2000);
    return () => clearInterval(interval);
  }, []);

  const nodes = [
    { label: "Jira Trigger", color: "#3b82f6" },
    { label: "AI Analyze", color: "#8b5cf6" },
    { label: "Git Branch", color: "#22c55e" },
    { label: "Slack Notify", color: "#f59e0b" },
  ];

  return (
    <div>
      <div className="flex items-center justify-center gap-3 py-6">
        {nodes.map((node, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${activeNode === i ? "scale-110" : "scale-100 opacity-50"}`}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center border transition-all duration-500"
                style={{
                  borderColor: activeNode === i ? node.color : "rgba(255,255,255,0.08)",
                  backgroundColor: activeNode === i ? `${node.color}15` : "rgba(255,255,255,0.03)",
                  boxShadow: activeNode === i ? `0 0 24px ${node.color}20` : "none",
                }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: node.color, opacity: activeNode === i ? 1 : 0.3 }} />
              </div>
              <span className="text-[9px] text-white/40">{node.label}</span>
            </div>
            {i < 3 && <div className="w-8 h-px bg-white/10 mb-5" />}
          </div>
        ))}
      </div>
      <div className="text-center">
        <span className="text-[10px] text-white/25">
          {activeNode === 0 && "Listening for new issues..."}
          {activeNode === 1 && "AI analyzing requirements..."}
          {activeNode === 2 && "Creating feature branch..."}
          {activeNode === 3 && "Team notified in #dev"}
        </span>
      </div>
    </div>
  );
}

/* ── AI Code Review Mockup ── */
function AIMockup() {
  const [charCount, setCharCount] = useState(0);
  const fullText = "The PR looks good overall. Found 2 potential issues: Missing null check in handleAuth() and SQL query should use parameterized queries to prevent injection.";

  useEffect(() => {
    const cycle = () => {
      setCharCount(0);
      let i = 0;
      const typeInterval = setInterval(() => {
        i += 2;
        setCharCount(Math.min(i, fullText.length));
        if (i >= fullText.length) { clearInterval(typeInterval); setTimeout(cycle, 4000); }
      }, 25);
    };
    const initial = setTimeout(cycle, 1000);
    return () => clearTimeout(initial);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-3">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[10px] text-white/15">AI Code Review</span>
      </div>
      <div className="bg-white/5 rounded-xl p-4 border border-white/5 h-[140px] overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
          </div>
          <span className="text-[10px] text-white/30">Claude AI</span>
          {charCount < fullText.length && <span className="text-[9px] text-[#8b5cf6]/50 ml-auto">analyzing...</span>}
        </div>
        <p className="text-[12px] text-white/60 leading-relaxed">
          {fullText.slice(0, charCount)}
          {charCount < fullText.length && <span className="inline-block w-0.5 h-3 bg-[#8b5cf6] ml-px animate-pulse" />}
        </p>
      </div>
    </div>
  );
}

/* ── Git Automation Mockup ── */
function GitMockup() {
  const [step, setStep] = useState(0);
  const cmds = [
    { text: "$ git checkout -b feat/PROJ-42", color: "text-white/40" },
    { text: "$ git commit -m \"feat: auth flow\"", color: "text-white/40" },
    { text: "$ gh pr create --base main", color: "text-white/40" },
    { text: "✓ PR #47 created", color: "text-emerald-400" },
  ];

  useEffect(() => {
    const cycle = () => {
      setStep(0);
      let i = 0;
      const interval = setInterval(() => { i++; setStep(i); if (i >= cmds.length) { clearInterval(interval); setTimeout(cycle, 4000); } }, 1000);
    };
    const initial = setTimeout(cycle, 500);
    return () => clearTimeout(initial);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-3">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[10px] text-white/15">Terminal</span>
      </div>
      <div className="font-mono text-[12px] space-y-2 min-h-[120px]">
        {cmds.slice(0, step + 1).map((cmd, i) => (
          <div key={i} className={cmd.color}>{cmd.text}</div>
        ))}
        {step < cmds.length - 1 && <div className="w-2 h-3 bg-white/30 animate-pulse inline-block" />}
      </div>
    </div>
  );
}

/* ── Spinning integration circle with real icons ── */
function IntegrationsCircle() {
  const integrations = [
    { name: "Jira", svg: <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.005-1.005z" fill="#0052CC"/> },
    { name: "GitHub", svg: <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="white"/> },
    { name: "GitLab", svg: <path d="m23.6 9.593-.033-.086L20.3.98a.851.851 0 00-.336-.405.875.875 0 00-1.014.067.876.876 0 00-.253.388L16.47 7.813H7.537L5.312 1.03a.857.857 0 00-.253-.388.875.875 0 00-1.014-.067.855.855 0 00-.337.405L.44 9.507l-.033.085a6.066 6.066 0 002.012 6.996l.012.009.03.023 4.975 3.727 2.462 1.863 1.5 1.134a1.009 1.009 0 001.22 0l1.5-1.134 2.462-1.863 5.005-3.75.013-.01a6.068 6.068 0 002.009-6.994z" fill="#FC6D26"/> },
    { name: "Slack", svg: <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834z" fill="#E01E5A"/> },
    { name: "Discord", svg: <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2"/> },
    { name: "Telegram", svg: <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="#26A5E4"/> },
    { name: "Linear", svg: <path d="M1.04 11.22a.86.86 0 00-.16.68c.72 4.48 4.24 8 8.72 8.72a.86.86 0 00.68-.16L1.04 11.22zm-.76 2.86c.56 2.72 2.24 5.04 4.52 6.4L.28 15.96a.86.86 0 010-1.88zM6.48 3.24C8.16 1.24 10.64 0 13.44 0 19.2 0 24 4.8 24 10.56c0 2.8-1.24 5.28-3.24 6.96L6.48 3.24z" fill="#5E6AD2"/> },
    { name: "Claude", svg: <circle cx="12" cy="12" r="10" fill="#D4A27F"/> },
    { name: "OpenAI", svg: <path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 0011.702.198 6.046 6.046 0 005.19 2.16 6.028 6.028 0 001.178 6.07a6.048 6.048 0 00.734 7.109 5.985 5.985 0 00.516 4.91 6.046 6.046 0 006.51 2.9A6.065 6.065 0 0012.298 23.8a6.046 6.046 0 006.512-1.962 6.028 6.028 0 004.012-3.91 6.048 6.048 0 00-.734-7.109z" fill="#10a37f"/> },
  ];

  return (
    <div className="py-4">
      <div className="relative w-52 h-52 md:w-64 md:h-64 mx-auto">
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">10+</div>
            <div className="text-[10px] text-white/30 mt-1">Integrations</div>
          </div>
        </div>
        <div className="absolute inset-0" style={{ animation: "spin-slow 30s linear infinite" }}>
          {integrations.map((int, i) => {
            const angle = (i / integrations.length) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 50 + 42 * Math.cos(rad);
            const y = 50 + 42 * Math.sin(rad);
            return (
              <div key={int.name} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", animation: "spin-slow-reverse 30s linear infinite" }}>
                <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center" title={int.name}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5">{int.svg}</svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Feature Section (alternating layout) ── */
function FeatureSection({ title, description, children, reverse = false }: { title: string; description: string; children: React.ReactNode; reverse?: boolean }) {
  return (
    <AnimateOnScroll>
      <div className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} gap-8 md:gap-12 items-center mb-20 md:mb-28`}>
        <div className="flex-1 max-w-lg">
          <h3 className="text-2xl md:text-3xl font-bold mb-4 leading-tight">{title}</h3>
          <p className="text-base text-[var(--text-muted)] leading-relaxed">{description}</p>
        </div>
        <div className="flex-1 w-full">
          <div className="bg-[#0f0f1a] rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/20 border border-white/5">
            {children}
          </div>
        </div>
      </div>
    </AnimateOnScroll>
  );
}

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <AnimateOnScroll>
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-[var(--primary)] to-[#a78bfa] bg-clip-text text-transparent">automate</span>
            </h2>
            <p className="mt-4 text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
              Build powerful development automations without writing glue code.
            </p>
          </div>
        </AnimateOnScroll>

        <FeatureSection
          title="Visual workflow builder"
          description="Drag and drop nodes to build automations. Connect triggers, AI agents, git operations, and notifications. See your pipeline execute in real-time with step-by-step progress."
        >
          <WorkflowMockup />
        </FeatureSection>

        <FeatureSection
          title="AI agents that understand your code"
          description="Built-in agents for code review, analysis, and generation. Bring your own API keys for Claude, OpenAI, or any provider. Keys encrypted with AES-256, never leave your server."
          reverse
        >
          <AIMockup />
        </FeatureSection>

        <FeatureSection
          title="End-to-end git automation"
          description="From Jira ticket to merged PR without touching the terminal. Clone repos, create branches, commit changes, and open pull requests — all automated."
        >
          <GitMockup />
        </FeatureSection>

        <FeatureSection
          title="Connect everything, no webhooks needed"
          description="Polling-based triggers work behind NAT — no public URL required. Connect Jira, GitHub, GitLab, Slack, Discord, and Telegram. Just add your token and activate."
          reverse
        >
          <IntegrationsCircle />
        </FeatureSection>
      </div>
    </section>
  );
}
