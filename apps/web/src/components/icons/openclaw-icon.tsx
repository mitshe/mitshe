export function OpenClawIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Claw shape */}
      <path d="M6 3c0 3-2 5-2 8s2 5 2 8" />
      <path d="M12 3c0 3-2 5-2 8s2 5 2 8" />
      <path d="M18 3c0 3-2 5-2 8s2 5 2 8" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}
