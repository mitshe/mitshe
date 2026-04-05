export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="mitshe" className="h-5 w-5" />
          <span className="font-bold text-sm font-brand">mitshe</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
          <a href="https://github.com/mitshe/mitshe" target="_blank" rel="noopener" className="hover:text-[var(--text)] transition-colors">GitHub</a>
          <a href="https://docs.mitshe.com" className="hover:text-[var(--text)] transition-colors">Docs</a>
          <a href="https://github.com/mitshe/mitshe/issues" target="_blank" rel="noopener" className="hover:text-[var(--text)] transition-colors">Issues</a>
        </div>

        <p className="text-xs text-[var(--text-muted)]/50">
          MIT License &middot; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
