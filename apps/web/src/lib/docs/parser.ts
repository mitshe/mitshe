export type ContentPart =
  | { type: "markdown"; content: string }
  | {
      type: "callout";
      calloutType: "info" | "warning" | "tip";
      content: string;
    }
  | { type: "steps"; steps: { title: string; content: string }[] }
  | {
      type: "cards";
      cards: { title: string; icon: string; href: string; desc: string }[];
    }
  | { type: "diagram"; parts: { label: string; sublabel: string }[] }
  | { type: "example"; content: string }
  | { type: "outputref"; lines: string[] }
  | { type: "nodelist"; nodes: { type: string; name: string; desc: string }[] };

export function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];

  const blockRegex =
    /:::(info|warning|tip|steps)\n([\s\S]*?):::|<cards>([\s\S]*?)<\/cards>|<diagram>([\s\S]*?)<\/diagram>|<example>([\s\S]*?)<\/example>|<outputref>([\s\S]*?)<\/outputref>|<nodelist>([\s\S]*?)<\/nodelist>/g;

  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const before = content.slice(lastIndex, match.index).trim();
      if (before) {
        parts.push({ type: "markdown", content: before });
      }
    }

    if (match[1]) {
      const blockType = match[1];
      const blockContent = match[2].trim();

      if (blockType === "steps") {
        const stepRegex = /###\s+(.+)\n([\s\S]*?)(?=###|$)/g;
        const steps: { title: string; content: string }[] = [];
        let stepMatch;
        while ((stepMatch = stepRegex.exec(blockContent)) !== null) {
          steps.push({
            title: stepMatch[1].trim(),
            content: stepMatch[2].trim(),
          });
        }
        parts.push({ type: "steps", steps });
      } else {
        parts.push({
          type: "callout",
          calloutType: blockType as "info" | "warning" | "tip",
          content: blockContent,
        });
      }
    } else if (match[3]) {
      const cardsContent = match[3];
      const cardRegex =
        /<card title="([^"]+)" icon="([^"]+)" href="([^"]+)">([\s\S]*?)<\/card>/g;
      const cards: {
        title: string;
        icon: string;
        href: string;
        desc: string;
      }[] = [];
      let cardMatch;
      while ((cardMatch = cardRegex.exec(cardsContent)) !== null) {
        cards.push({
          title: cardMatch[1],
          icon: cardMatch[2],
          href: cardMatch[3],
          desc: cardMatch[4].trim(),
        });
      }
      parts.push({ type: "cards", cards });
    } else if (match[4]) {
      const diagramContent = match[4].trim();
      const lines = diagramContent.split("\n");
      const diagramParts =
        lines[1]?.split(" -> ").map((label, i) => ({
          label,
          sublabel: lines[0]?.split(" -> ")[i] || "",
        })) || [];
      parts.push({ type: "diagram", parts: diagramParts });
    } else if (match[5]) {
      parts.push({ type: "example", content: match[5].trim() });
    } else if (match[6]) {
      const lines = match[6].trim().split("\n").filter(Boolean);
      parts.push({ type: "outputref", lines });
    } else if (match[7]) {
      const nodeListContent = match[7];
      const nodeRegex =
        /<node type="([^"]+)" name="([^"]+)" desc="([^"]+)" \/>/g;
      const nodes: { type: string; name: string; desc: string }[] = [];
      let nodeMatch;
      while ((nodeMatch = nodeRegex.exec(nodeListContent)) !== null) {
        nodes.push({
          type: nodeMatch[1],
          name: nodeMatch[2],
          desc: nodeMatch[3],
        });
      }
      parts.push({ type: "nodelist", nodes });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      parts.push({ type: "markdown", content: remaining });
    }
  }

  if (parts.length === 0) {
    parts.push({ type: "markdown", content });
  }

  return parts;
}

export function extractHeadings(content: string) {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2];
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    headings.push({ level, text, id });
  }
  return headings;
}
