import { cn } from "@/lib/utils";

interface Node {
  type: string;
  name: string;
  desc: string;
}

interface NodeListBlockProps {
  nodes: Node[];
}

const typeColors: Record<string, string> = {
  trigger: "bg-purple-500",
  ai: "bg-blue-500",
  git: "bg-green-500",
  jira: "bg-blue-600",
  slack: "bg-pink-500",
  http: "bg-orange-500",
  control: "bg-gray-500",
};

export function NodeListBlock({ nodes }: NodeListBlockProps) {
  return (
    <div className="my-4 space-y-2">
      {nodes.map((node) => (
        <div
          key={node.name}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              typeColors[node.type] || "bg-gray-400",
            )}
          />
          <span className="font-medium text-sm w-32">{node.name}</span>
          <span className="text-sm text-muted-foreground">{node.desc}</span>
        </div>
      ))}
    </div>
  );
}
