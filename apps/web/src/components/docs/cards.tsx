import Link from "next/link";
import {
  Sparkles,
  Workflow,
  MessageSquare,
  BookOpen,
  GitBranch,
  Box,
} from "lucide-react";

interface Card {
  title: string;
  icon: string;
  href: string;
  desc: string;
}

interface CardsBlockProps {
  cards: Card[];
}

const iconMap: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  workflow: Workflow,
  message: MessageSquare,
  book: BookOpen,
  git: GitBranch,
};

export function CardsBlock({ cards }: CardsBlockProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 my-6">
      {cards.map((card) => {
        const Icon = iconMap[card.icon] || Box;
        return (
          <Link
            key={card.title}
            href={card.href}
            className="group block p-5 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
