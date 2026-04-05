"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import AnimateOnScroll from "./AnimateOnScroll";

export default function BottomCTA() {
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const dockerCmd = "docker run -d --name mitshe -p 3000:3000 -p 3001:3001 -v mitshe-data:/build/data -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/mitshe/mitshe:latest";

  return (
    <section className="bg-[#0f0f1a] py-24 md:py-32 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-[var(--primary)]/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-[var(--accent)]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          {/* Self-host - primary */}
          <AnimateOnScroll>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                <span className="text-[10px] font-medium text-white/40">MIT License</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Start self-hosting now
              </h2>

              <p className="text-white/40 mb-6 leading-relaxed">
                Free, open source, your infrastructure. AI credentials encrypted with AES-256.
                Your data never leaves your servers.
              </p>

              {/* Docker command */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer group mb-6 hover:border-white/20 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(dockerCmd);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <span className="text-white/20 text-xs">$</span>
                <code className="text-[11px] text-white/40 truncate flex-1 font-mono">
                  docker run -d --name mitshe ... ghcr.io/mitshe/mitshe:latest
                </code>
                <span className="text-[10px] text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0 px-2 py-1 rounded bg-white/5">
                  {copied ? "Copied!" : "Copy"}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/mitshe/mitshe"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#0f0f1a] font-semibold hover:bg-white/90 transition-all text-sm hover:-translate-y-0.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  Star on GitHub
                </a>
                <a
                  href="https://docs.mitshe.com"
                  className="text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Read the docs &rarr;
                </a>
              </div>
            </div>
          </AnimateOnScroll>

          {/* Cloud waitlist */}
          <AnimateOnScroll delay={0.15}>
            <div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  <span className="text-[10px] font-medium text-[var(--accent)]">Coming Soon</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  <span className="font-brand">mitshe</span> Cloud
                </h3>
                <p className="text-sm text-white/30 mb-5 leading-relaxed">
                  Same features, zero infrastructure. We host it, you use it.
                </p>

                {submitted ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                    <span className="text-xs text-emerald-400">You&apos;re on the list!</span>
                  </div>
                ) : (
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSubmitted(true);
                    }}
                  >
                    <input
                      type="email"
                      required
                      placeholder="you@company.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
                    />
                    <button
                      type="submit"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-dark)] transition-all"
                    >
                      Join waitlist
                    </button>
                  </form>
                )}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
