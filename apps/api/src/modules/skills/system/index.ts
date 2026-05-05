import * as fs from 'fs';
import * as path from 'path';

export interface SystemSkillDefinition {
  name: string;
  slug: string;
  category: string;
  description: string;
  instructions: string;
}

const SKILLS_DIR = path.join(__dirname);

const SKILL_FILES: Array<{
  file: string;
  name: string;
  slug: string;
  category: string;
}> = [
  {
    file: 'e2e-testing.md',
    name: 'E2E Testing',
    slug: 'e2e-testing',
    category: 'testing',
  },
  {
    file: 'api-testing.md',
    name: 'API Testing',
    slug: 'api-testing',
    category: 'testing',
  },
  {
    file: 'unit-testing.md',
    name: 'Unit Testing',
    slug: 'unit-testing',
    category: 'testing',
  },
  {
    file: 'docker.md',
    name: 'Docker',
    slug: 'docker',
    category: 'devops',
  },
  {
    file: 'code-review.md',
    name: 'Code Review',
    slug: 'code-review',
    category: 'quality',
  },
  {
    file: 'security-audit.md',
    name: 'Security Audit',
    slug: 'security-audit',
    category: 'quality',
  },
];

function parseSkillFile(filePath: string): {
  description: string;
  instructions: string;
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

  if (match) {
    const frontmatter = match[1];
    const instructions = match[2].trim();
    const descMatch = frontmatter.match(/description:\s*(.+)/);
    return {
      description: descMatch ? descMatch[1].trim() : '',
      instructions,
    };
  }

  return { description: '', instructions: content.trim() };
}

export function getSystemSkills(): SystemSkillDefinition[] {
  return SKILL_FILES.map((skill) => {
    const filePath = path.join(SKILLS_DIR, skill.file);
    const { description, instructions } = parseSkillFile(filePath);
    return {
      name: skill.name,
      slug: skill.slug,
      category: skill.category,
      description,
      instructions,
    };
  });
}
