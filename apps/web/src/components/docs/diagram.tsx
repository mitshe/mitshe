import React from "react";
import { ArrowRight } from "lucide-react";

interface DiagramPart {
  label: string;
  sublabel: string;
}

interface DiagramBlockProps {
  parts: DiagramPart[];
}

export function DiagramBlock({ parts }: DiagramBlockProps) {
  return (
    <div className="my-8 p-6 rounded-xl bg-muted/30 border overflow-x-auto">
      <div className="flex items-center justify-center gap-2 min-w-max">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div className="px-4 py-2 rounded-lg bg-background border shadow-sm text-sm font-medium text-center">
                {part.label}
              </div>
              {part.sublabel && (
                <span className="text-xs text-muted-foreground mt-1">
                  {part.sublabel}
                </span>
              )}
            </div>
            {index < parts.length - 1 && (
              <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
