import { MarkdownBlock } from "./markdown-block";

interface Step {
  title: string;
  content: string;
}

interface StepsBlockProps {
  steps: Step[];
}

export function StepsBlock({ steps }: StepsBlockProps) {
  return (
    <div className="my-8 space-y-0">
      {steps.map((step, index) => (
        <div
          key={index}
          className="relative pl-10 pb-8 last:pb-0 border-l-2 border-muted ml-4"
        >
          <div className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {index + 1}
          </div>
          <div className="pt-0.5">
            <h4 className="font-semibold text-base mb-2">{step.title}</h4>
            <div className="text-muted-foreground text-sm leading-relaxed">
              <MarkdownBlock content={step.content} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
