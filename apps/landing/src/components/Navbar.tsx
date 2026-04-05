"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 px-4">
      <nav
        className={`transition-all duration-500 rounded-2xl max-w-3xl w-full ${
          scrolled
            ? "bg-white/70 backdrop-blur-xl border border-[var(--border)] shadow-lg shadow-black/5"
            : "bg-white/40 backdrop-blur-md border border-white/60"
        }`}
      >
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="mitshe" className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight font-brand">mitshe</span>
          </a>

          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors font-medium">How it works</a>
            <a href="#open-source" className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors font-medium">Open Source</a>
            <a href="https://github.com/mitshe/mitshe" target="_blank" rel="noopener" className="text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors font-medium flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </a>
          </div>

          <div className="hidden md:flex">
            <a href="https://github.com/mitshe/mitshe#run-it" className="px-4 py-1.5 rounded-full bg-[var(--primary)] text-white text-[13px] font-medium hover:bg-[var(--primary-dark)] transition-all hover:shadow-md">
              Get started
            </a>
          </div>

          <button className="md:hidden p-2 text-[var(--text-muted)]" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /> : <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-[var(--border)] px-6 py-4 space-y-3"
          >
            <a href="#features" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#how-it-works" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#open-source" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>Open Source</a>
            <a href="https://github.com/mitshe/mitshe#run-it" className="block w-full text-center px-5 py-2.5 rounded-full bg-[var(--primary)] text-white text-sm font-medium">
              Get started
            </a>
          </motion.div>
        )}
      </nav>
    </div>
  );
}
