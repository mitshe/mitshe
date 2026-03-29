interface OutputRefBlockProps {
  lines: string[];
}

export function OutputRefBlock({ lines }: OutputRefBlockProps) {
  return (
    <div className="my-4 rounded-lg bg-zinc-950 dark:bg-zinc-900 p-4 font-mono text-sm overflow-x-auto border border-zinc-800">
      {lines.map((line, i) => {
        const [expr, result] = line.split(/\s*→\s*/);
        return (
          <div key={i} className="flex gap-4 py-0.5">
            <span className="text-emerald-400">{expr}</span>
            {result && (
              <>
                <span className="text-zinc-500">→</span>
                <span className="text-zinc-300">{result}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
