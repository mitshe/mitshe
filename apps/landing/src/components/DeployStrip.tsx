"use client";

import { useState, useEffect, useRef } from "react";
import AnimateOnScroll from "./AnimateOnScroll";

function TypingTerminal() {
  const outputLines = [
    { text: "✓ Database initialized", color: "text-emerald-400" },
    { text: "✓ API running on :3001", color: "text-emerald-400" },
    { text: "✓ Frontend running on :3000", color: "text-emerald-400" },
    { text: "", color: "" },
    { text: "Open http://localhost:3000", color: "text-[var(--primary)] font-semibold" },
  ];

  const [visibleOutput, setVisibleOutput] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let i = 0;
          const interval = setInterval(() => {
            i++;
            setVisibleOutput(i);
            if (i >= outputLines.length) clearInterval(interval);
          }, 500);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="bg-[#0f0f1a] rounded-2xl overflow-hidden border border-white/5 shadow-xl">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[10px] text-white/15 ml-2">Terminal</span>
      </div>
      <div className="p-5 font-mono text-sm">
        <div className="text-white/40">$ docker run -d --name mitshe \</div>
        <div className="text-white/40 pl-4">-p 3000:3000 -p 3001:3001 \</div>
        <div className="text-white/40 pl-4">-v mitshe-data:/build/data \</div>
        <div className="text-white/50 pl-4">ghcr.io/mitshe/mitshe:latest</div>

        <div className="mt-3 space-y-0.5 min-h-[100px]">
          {outputLines.slice(0, visibleOutput).map((line, i) => (
            <div key={i} className={line.color}>{line.text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DeployStrip() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-3xl mx-auto px-6">
        <AnimateOnScroll>
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Deploy in one command
            </h2>
            <p className="text-[var(--text-muted)]">
              No dependencies. No config files. Works behind NAT.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll>
          <TypingTerminal />
        </AnimateOnScroll>
      </div>
    </section>
  );
}
