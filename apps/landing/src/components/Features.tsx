"use client";

import { useEffect, useState } from "react";
import AnimateOnScroll from "./AnimateOnScroll";

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

function SessionMockup() {
  const [step, setStep] = useState(0);
  const lines = [
    { text: "executor@session-b2e1:/workspace$ claude -p \"Write E2E tests for the checkout flow\"", color: "text-emerald-400/70" },
    { text: "Reading src/pages/checkout.tsx...", color: "text-white/30" },
    { text: "Creating tests/checkout.spec.ts...", color: "text-white/30" },
    { text: "$ npx playwright test checkout.spec.ts", color: "text-white/40" },
    { text: "  3 passed (4.2s)", color: "text-emerald-400" },
  ];

  useEffect(() => {
    const cycle = () => {
      setStep(0);
      let i = 0;
      const interval = setInterval(() => { i++; setStep(i); if (i >= lines.length) { clearInterval(interval); setTimeout(cycle, 4000); } }, 900);
    };
    const t = setTimeout(cycle, 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 px-1 mb-3">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[10px] text-white/15">Session Terminal</span>
      </div>
      <div className="font-mono text-[12px] space-y-1.5 min-h-[130px]">
        {lines.slice(0, step + 1).map((line, i) => (
          <div key={i} className={line.color}>{line.text}</div>
        ))}
        {step < lines.length - 1 && <div className="w-2 h-3 bg-white/30 animate-pulse inline-block" />}
      </div>
    </div>
  );
}

function SnapshotMockup() {
  return (
    <div className="space-y-3">
      {[
        { name: "Node.js + Postgres", size: "1.2 GB", status: "Ready", time: "2d ago" },
        { name: "React + Playwright", size: "890 MB", status: "Ready", time: "5d ago" },
        { name: "Python FastAPI", size: "720 MB", status: "Ready", time: "1w ago" },
      ].map((snap, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div>
            <div className="text-[13px] text-white/70 font-medium">{snap.name}</div>
            <div className="text-[10px] text-white/25 mt-0.5">{snap.size} &middot; {snap.time}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{snap.status}</span>
            <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillsMockup() {
  const skills = [
    { name: "/e2e-testing", desc: "Playwright best practices, assertions, tracing", cat: "Testing" },
    { name: "/security-audit", desc: "OWASP Top 10, dependency scanning, secret detection", cat: "Security" },
    { name: "/docker", desc: "Docker Compose, multi-stage builds, DinD", cat: "DevOps" },
    { name: "/code-review", desc: "Review checklist, refactoring suggestions", cat: "Quality" },
  ];

  return (
    <div className="space-y-2">
      {skills.map((s, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/5">
          <code className="text-[12px] text-[var(--primary)] font-mono whitespace-nowrap">{s.name}</code>
          <span className="text-[11px] text-white/30 truncate flex-1">{s.desc}</span>
          <span className="text-[9px] text-white/20 px-1.5 py-0.5 rounded bg-white/5 whitespace-nowrap">{s.cat}</span>
        </div>
      ))}
    </div>
  );
}

function WorkflowMockup() {
  const [activeNode, setActiveNode] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setActiveNode((prev) => (prev + 1) % 4), 2000);
    return () => clearInterval(interval);
  }, []);

  const nodes = [
    { label: "Git Push", color: "#22c55e" },
    { label: "AI Review", color: "#8b5cf6" },
    { label: "Run Tests", color: "#3b82f6" },
    { label: "Notify", color: "#f59e0b" },
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
          {activeNode === 0 && "Push detected on main..."}
          {activeNode === 1 && "AI reviewing changes..."}
          {activeNode === 2 && "Running test suite..."}
          {activeNode === 3 && "Team notified in #dev"}
        </span>
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <AnimateOnScroll>
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything your AI agent{" "}
              <span className="bg-gradient-to-r from-[var(--primary)] to-[#a78bfa] bg-clip-text text-transparent">needs to work</span>
            </h2>
            <p className="mt-4 text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
              Isolated environments, real tools, full observability.
            </p>
          </div>
        </AnimateOnScroll>

        <FeatureSection
          title="Isolated coding sessions"
          description="Each session is a Docker container with terminal, browser, and git. Claude Code works inside with full access to your repo, tools, and integrations. Watch everything in real-time."
        >
          <SessionMockup />
        </FeatureSection>

        <FeatureSection
          title="Snapshot and reuse"
          description="Set up an environment once — install dependencies, configure databases, prepare test data. Snapshot it. Spin up new sessions from that snapshot in seconds."
          reverse
        >
          <SnapshotMockup />
        </FeatureSection>

        <FeatureSection
          title="Skills as slash commands"
          description="Inject reusable instructions into Claude Code as slash commands. Built-in skills for E2E testing, security audits, code review, and more. Create your own."
        >
          <SkillsMockup />
        </FeatureSection>

        <FeatureSection
          title="Automate with workflows"
          description="Connect triggers to actions. Git push triggers AI review, test run, and Slack notification. Visual builder with real-time execution progress."
          reverse
        >
          <WorkflowMockup />
        </FeatureSection>
      </div>
    </section>
  );
}
