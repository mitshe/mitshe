import { Info, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "warning" | "tip";

const config: Record<
  CalloutType,
  {
    icon: typeof Info;
    bg: string;
    border: string;
    iconColor: string;
    textColor: string;
  }
> = {
  info: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
    iconColor: "text-blue-600 dark:text-blue-400",
    textColor: "text-blue-900 dark:text-blue-100",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400",
    textColor: "text-amber-900 dark:text-amber-100",
  },
  tip: {
    icon: Lightbulb,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    textColor: "text-emerald-900 dark:text-emerald-100",
  },
};

interface CalloutProps {
  type: CalloutType;
  children: React.ReactNode;
}

export function Callout({ type, children }: CalloutProps) {
  const { icon: Icon, bg, border, iconColor, textColor } = config[type];

  return (
    <div className={cn("my-6 flex gap-4 rounded-lg border p-4", bg, border)}>
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", iconColor)} />
      <div
        className={cn(
          "text-sm leading-relaxed [&>p]:m-0 [&_a]:underline [&_strong]:font-semibold",
          textColor,
        )}
      >
        {children}
      </div>
    </div>
  );
}
