"use client";

import { useEffect, useRef, useState } from "react";
import AnimateOnScroll from "./AnimateOnScroll";

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function BeforeAfter() {
  return (
    <section className="bg-[#0f0f1a] py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <AnimateOnScroll>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 md:gap-6 mb-6">
              <span className="text-4xl md:text-6xl font-bold text-white/20 line-through decoration-2">
                <AnimatedCounter end={43} /> min
              </span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/20">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-4xl md:text-6xl font-bold text-[var(--primary)]">
                <AnimatedCounter end={2} /> min
              </span>
            </div>
            <p className="text-white/30 text-lg">
              From new Jira ticket to merged PR with code review.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-2 gap-6">
          <AnimateOnScroll delay={0}>
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-6">
              <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-4">Manual workflow</h3>
              <div className="space-y-3">
                {["Open Jira, read ticket", "Switch to terminal, create branch", "Write code, run tests", "Open GitHub, create PR", "Copy link, paste in Slack", "Wait for review, iterate"].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] text-white/20">{i + 1}</span>
                    </div>
                    <span className="text-sm text-white/30">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.15}>
            <div className="rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/15 p-6">
              <h3 className="text-sm font-medium text-[var(--primary)]/60 uppercase tracking-wider mb-4">With mitshe</h3>
              <div className="space-y-3">
                {["Jira trigger detects new ticket", "AI analyzes requirements", "Branch created, code generated", "PR opened with full description", "Team notified on Slack automatically"].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    </div>
                    <span className="text-sm text-white/60">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
