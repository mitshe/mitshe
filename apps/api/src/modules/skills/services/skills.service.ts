import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { CreateSkillDto, UpdateSkillDto } from '../dto/skill.dto';

interface GitHubTreeItem {
  path: string;
  type: string;
  url: string;
}

interface GitHubFileResponse {
  content: string;
  encoding: string;
}

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateSkillDto) {
    return this.prisma.skill.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        instructions: dto.instructions,
        createdBy: userId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.skill.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const skill = await this.prisma.skill.findFirst({
      where: { id, organizationId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  async update(organizationId: string, id: string, dto: UpdateSkillDto) {
    await this.findOne(organizationId, id);

    return this.prisma.skill.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.instructions && { instructions: dto.instructions }),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.skill.delete({ where: { id } });
  }

  async importFromGitHub(
    organizationId: string,
    userId: string,
    repo: string,
    path?: string,
    branch = 'main',
  ): Promise<{ imported: number; skills: string[] }> {
    const mdFiles = await this.fetchMdFilesFromGitHub(repo, branch, path);

    if (mdFiles.length === 0) {
      throw new BadRequestException(
        'No .md files found in the specified repository/path',
      );
    }

    const imported: string[] = [];

    for (const file of mdFiles) {
      const content = await this.fetchFileContent(file.url);
      const { name, description, instructions } =
        this.parseSkillFile(file.path, content);

      await this.prisma.skill.create({
        data: {
          organizationId,
          name,
          description,
          instructions,
          createdBy: userId,
        },
      });

      imported.push(name);
    }

    this.logger.log(
      `Imported ${imported.length} skills from ${repo} for org ${organizationId}`,
    );

    return { imported: imported.length, skills: imported };
  }

  private async fetchMdFilesFromGitHub(
    repo: string,
    branch: string,
    subPath?: string,
  ): Promise<Array<{ path: string; url: string }>> {
    const url = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'mitshe',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new BadRequestException(
          `Repository ${repo} not found or is private`,
        );
      }
      throw new BadRequestException(
        `GitHub API error: ${res.status} ${res.statusText}`,
      );
    }

    const data = (await res.json()) as { tree: GitHubTreeItem[] };

    return data.tree
      .filter((item) => {
        if (item.type !== 'blob') return false;
        if (!item.path.endsWith('.md')) return false;
        // Skip common non-skill files
        const lower = item.path.toLowerCase();
        if (
          lower === 'readme.md' ||
          lower === 'readme.zh.md' ||
          lower === 'contributing.md' ||
          lower === 'license.md' ||
          lower === 'changelog.md' ||
          lower === 'examples.md' ||
          lower === 'cursor.md'
        )
          return false;
        // Filter by subpath if provided
        if (subPath) {
          return item.path.startsWith(subPath);
        }
        return true;
      })
      .map((item) => ({ path: item.path, url: item.url }));
  }

  private async fetchFileContent(blobUrl: string): Promise<string> {
    const res = await fetch(blobUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'mitshe',
      },
    });

    if (!res.ok) {
      throw new BadRequestException('Failed to fetch file from GitHub');
    }

    const data = (await res.json()) as GitHubFileResponse;

    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    return data.content;
  }

  private parseSkillFile(
    filePath: string,
    content: string,
  ): { name: string; description: string | undefined; instructions: string } {
    // Extract filename without extension as name
    const fileName = filePath.split('/').pop()?.replace(/\.md$/, '') || filePath;
    const name = fileName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Parse YAML frontmatter if present
    let description: string | undefined;
    let instructions = content;

    const frontmatterMatch = content.match(
      /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/,
    );
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      instructions = frontmatterMatch[2].trim();

      // Extract description from frontmatter
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      if (descMatch) {
        description = descMatch[1].trim();
      }
    }

    return { name, description, instructions };
  }

  async buildInstructions(
    organizationId: string,
    skillIds: string[],
  ): Promise<string> {
    if (skillIds.length === 0) return '';

    const skills = await this.prisma.skill.findMany({
      where: {
        id: { in: skillIds },
        organizationId,
      },
    });

    return skills
      .map((s) => `## Skill: ${s.name}\n\n${s.instructions}`)
      .join('\n\n---\n\n');
  }

  async getSkillsForSession(
    organizationId: string,
    skillIds: string[],
  ): Promise<Array<{ name: string; instructions: string }>> {
    if (skillIds.length === 0) return [];

    const skills = await this.prisma.skill.findMany({
      where: {
        id: { in: skillIds },
        organizationId,
      },
    });

    return skills.map((s) => ({ name: s.name, instructions: s.instructions }));
  }
}
