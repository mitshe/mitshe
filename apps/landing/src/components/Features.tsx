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
      <div className="flex items-center justify-center gap-3 py-4">
        {nodes.map((node, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${activeNode === i ? "scale-110" : "scale-100 opacity-50"}`}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500"
                style={{
                  borderColor: activeNode === i ? node.color : "rgba(255,255,255,0.08)",
                  backgroundColor: activeNode === i ? `${node.color}15` : "rgba(255,255,255,0.03)",
                  boxShadow: activeNode === i ? `0 0 24px ${node.color}20` : "none",
                }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: node.color, opacity: activeNode === i ? 1 : 0.3 }} />
              </div>
              <span className="text-[9px] text-white/40">{node.label}</span>
            </div>
            {i < 3 && <div className="w-6 h-px bg-white/10 mb-5" />}
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
  const fullText = "The PR looks good overall. Found 2 potential issues: Missing null check in handleAuth() and SQL query should use parameterized queries.";

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
    <div className="bg-white/5 rounded-lg p-3 border border-white/5 h-[120px] overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
        </div>
        <span className="text-[10px] text-white/30">Claude AI</span>
      </div>
      <p className="text-[11px] text-white/60 leading-relaxed">
        {fullText.slice(0, charCount)}
        {charCount < fullText.length && <span className="inline-block w-0.5 h-3 bg-[#8b5cf6] ml-px animate-pulse" />}
      </p>
    </div>
  );
}

/* ── Git Automation Mockup ── */
function GitMockup() {
  const [step, setStep] = useState(0);
  const cmds = ["$ git checkout -b feat/PROJ-42", "$ git commit -m \"feat: auth flow\"", "$ gh pr create --base main", "✓ PR #47 created"];

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
    <div className="font-mono text-[11px] space-y-1.5 min-h-[100px]">
      {cmds.slice(0, step + 1).map((cmd, i) => (
        <div key={i} className={cmd.startsWith("✓") ? "text-emerald-400" : "text-white/40"}>{cmd}</div>
      ))}
      {step < cmds.length - 1 && <div className="w-2 h-3 bg-white/30 animate-pulse inline-block" />}
    </div>
  );
}

/* ── Integrations grid ── */
function IntegrationsGrid() {
  const items = ["Jira", "GitHub", "GitLab", "Slack", "Discord", "Telegram", "Linear", "Claude", "OpenAI"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((name) => (
        <div key={name} className="flex items-center justify-center p-2 rounded-lg bg-white/5 border border-white/5 text-[9px] text-white/30 hover:text-white/60 hover:border-white/15 transition-all cursor-default">
          {name}
        </div>
      ))}
    </div>
  );
}

/* ── Bento cell ── */
function BentoCell({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0f0f1a] rounded-2xl border border-white/[0.06] p-5 flex flex-col card-glow ${className}`}>
      <div className="flex-1 mb-4">{children}</div>
      <h3 className="text-sm font-semibold text-white/70">{title}</h3>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <AnimateOnScroll>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-[var(--primary)] to-[#a78bfa] bg-clip-text text-transparent">automate</span>
            </h2>
            <p className="mt-4 text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
              Build powerful development automations without writing glue code.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Bento Grid - 2x2 */}
        <div className="grid md:grid-cols-2 gap-4">
          <AnimateOnScroll delay={0}>
            <BentoCell title="Visual Workflow Builder">
              <WorkflowMockup />
            </BentoCell>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.1}>
            <BentoCell title="AI Code Review">
              <AIMockup />
            </BentoCell>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.2}>
            <BentoCell title="Git Automation">
              <GitMockup />
            </BentoCell>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.3}>
            <BentoCell title="10+ Integrations">
              <IntegrationsGrid />
            </BentoCell>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
