"use client";

import { useState } from "react";
import AnimateOnScroll from "./AnimateOnScroll";

export default function BottomCTA() {
  const [copied, setCopied] = useState(false);
  const dockerCmd = "docker run -d --name mitshe -p 3000:3000 -p 3001:3001 -v mitshe-data:/build/data -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/mitshe/mitshe:latest";

  const steps = [
    { num: "1", title: "Run one command", desc: "Single Docker container. SQLite built-in. No external dependencies." },
    { num: "2", title: "Add your API key", desc: "Bring your own key for Claude, OpenAI, OpenRouter, or any provider." },
    { num: "3", title: "Start a session", desc: "Claude Code gets an isolated workspace with terminal, git, and browser." },
  ];

  return (
    <section className="bg-[#0f0f1a] py-24 md:py-32 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[var(--primary)]/6 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative">
        <AnimateOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Running in under a minute
            </h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Self-hosted, open source, MIT licensed. Your data stays on your infrastructure.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.1}>
          <div
            className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer group mb-12 max-w-2xl mx-auto hover:border-white/20 transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(dockerCmd);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <span className="text-white/20 text-sm">$</span>
            <code className="text-[12px] text-white/50 truncate flex-1 font-mono">
              docker run -d --name mitshe -p 3000:3000 -p 3001:3001 ... ghcr.io/mitshe/mitshe:latest
            </code>
            <span className="text-[11px] text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0 px-3 py-1.5 rounded-lg bg-white/5">
              {copied ? "Copied!" : "Copy"}
            </span>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.2}>
          <div className="grid md:grid-cols-3 gap-6 mb-14">
            {steps.map((step) => (
              <div key={step.num} className="text-center md:text-left">
                <div className="inline-flex w-8 h-8 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/25 items-center justify-center mb-3">
                  <span className="text-sm font-semibold text-[var(--primary)]">{step.num}</span>
                </div>
                <h3 className="text-white font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.3}>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/mitshe/mitshe"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#0f0f1a] font-semibold hover:bg-white/90 transition-all text-sm hover:-translate-y-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Star on GitHub
            </a>
            <a
              href="https://discord.gg/KE2zm6njBf"
              target="_blank"
              rel="noopener"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Join Discord &rarr;
            </a>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
