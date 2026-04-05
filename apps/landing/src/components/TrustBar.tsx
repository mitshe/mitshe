"use client";

import { motion } from "framer-motion";

const integrations = ["Jira", "GitHub", "GitLab", "Slack", "Discord", "Telegram", "Linear", "Claude", "OpenAI", "and more"];

export default function TrustBar() {
  return (
    <section className="py-6 border-y border-[var(--border)]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
          <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">Works with</span>
          {integrations.map((name, i) => (
            <motion.span
              key={name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="text-sm text-[var(--text-muted)]/40 hover:text-[var(--text)] transition-colors cursor-default font-medium"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
