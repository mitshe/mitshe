"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function SessionPreview() {
  return (
    <div className="bg-[#0f0f1a] rounded-xl overflow-hidden border border-white/[0.06] shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex gap-1 ml-3">
          <div className="px-3 py-1 rounded-md bg-white/10 text-[10px] text-white/60">Terminal</div>
          <div className="px-3 py-1 rounded-md text-[10px] text-white/25 hover:text-white/40">Browser</div>
          <div className="px-3 py-1 rounded-md text-[10px] text-white/25 hover:text-white/40">Files</div>
        </div>
      </div>
      <div className="p-5 font-mono text-[12px] space-y-1.5 min-h-[160px]">
        <div className="text-white/25">executor@session-a7f3:/workspace$</div>
        <div className="text-emerald-400/70">claude -p &quot;Fix the auth bug in login.ts&quot;</div>
        <div className="text-white/30 mt-2">Analyzing login.ts...</div>
        <div className="text-white/30">Found issue: missing null check on line 47</div>
        <div className="text-white/30">Applying fix...</div>
        <div className="text-emerald-400/50 mt-1">$ git commit -m &quot;fix: null check in auth flow&quot;</div>
        <div className="text-emerald-400/50">$ gh pr create --base main</div>
        <div className="text-emerald-400 mt-1">PR #142 created successfully</div>
      </div>
    </div>
  );
}

export default function Hero() {
  const [copied, setCopied] = useState(false);

  const dockerCmd = "docker run -d --name mitshe -p 3000:3000 -p 3001:3001 -v mitshe-data:/build/data -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/mitshe/mitshe:latest";

  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/[0.04] via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[var(--primary)]/[0.06] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="text-center mb-14">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--primary)]/8 border border-[var(--primary)]/15 mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
            <span className="text-xs font-medium">Open Source &middot; Self-hosted</span>
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="block">Workspace manager</span>
            <span className="block bg-gradient-to-r from-[var(--primary)] to-[#a78bfa] bg-clip-text text-transparent">for AI coding agents.</span>
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="mt-5 text-lg md:text-xl text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            Give Claude Code an isolated Docker environment with terminal, browser, and git.
            Observe what it does, snapshot the state, automate with workflows.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://github.com/mitshe/mitshe#quick-start"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold transition-all shadow-lg shadow-[var(--primary)]/20 hover:shadow-xl hover:-translate-y-0.5 text-sm">
              Get started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
            <a href="https://github.com/mitshe/mitshe" target="_blank" rel="noopener"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-[var(--border)] hover:bg-[var(--text)]/5 font-medium transition-all text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              View on GitHub
            </a>
          </motion.div>
        </div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
          className="max-w-3xl mx-auto">
          <SessionPreview />
        </motion.div>

        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={5}
          className="max-w-xl mx-auto mt-6"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1a2e] border border-white/5 cursor-pointer group"
            onClick={() => {
              navigator.clipboard.writeText(dockerCmd);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <span className="text-white/20 text-xs">$</span>
            <code className="text-[11px] text-white/40 truncate flex-1 font-mono">
              docker run -d --name mitshe -p 3000:3000 ... ghcr.io/mitshe/mitshe:latest
            </code>
            <span className="text-[10px] text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0 px-2 py-1 rounded bg-white/5">
              {copied ? "Copied!" : "Copy"}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
