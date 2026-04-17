import { Injectable } from '@nestjs/common';
import { SkillsService } from '../../skills/services/skills.service';
import { McpTool, McpToolResult } from '../mcp.types';

@Injectable()
export class SkillTools {
  constructor(private readonly skillsService: SkillsService) {}

  getTools(): McpTool[] {
    return [
      {
        name: 'skill_list',
        description: 'List all skills (reusable CLAUDE.md instructions).',
        inputSchema: { type: 'object', properties: {} },
        execute: async (orgId): Promise<McpToolResult> => {
          const skills = await this.skillsService.findAll(orgId);
          return {
            content: JSON.stringify(
              skills.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                category: s.category,
              })),
            ),
          };
        },
      },
      {
        name: 'skill_create',
        description:
          'Create a new skill. A skill is reusable markdown instructions ' +
          'that get appended to CLAUDE.md when creating sessions. ' +
          'Use this when the user asks to create skills, NOT sessions.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Skill name' },
            description: { type: 'string', description: 'Short description' },
            category: {
              type: 'string',
              description: 'Category',
              enum: [
                'testing',
                'devops',
                'backend',
                'frontend',
                'quality',
                'other',
              ],
            },
            instructions: {
              type: 'string',
              description:
                'Markdown instructions for Claude Code. Be detailed and specific.',
            },
          },
          required: ['name', 'instructions'],
        },
        execute: async (orgId, userId, input): Promise<McpToolResult> => {
          const skill = await this.skillsService.create(orgId, userId, {
            name: input.name as string,
            description: input.description as string,
            category: input.category as string,
            instructions: input.instructions as string,
          });
          return {
            content: JSON.stringify({
              id: skill.id,
              name: skill.name,
              message: `Skill "${skill.name}" created.`,
            }),
          };
        },
      },
      {
        name: 'skill_get',
        description: 'Get full details of a skill including its instructions.',
        inputSchema: {
          type: 'object',
          properties: {
            skillId: { type: 'string', description: 'Skill ID' },
          },
          required: ['skillId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const skill = await this.skillsService.findOne(
            orgId,
            input.skillId as string,
          );
          return { content: JSON.stringify(skill) };
        },
      },
      {
        name: 'skill_update',
        description: 'Update a skill name, description, or instructions.',
        inputSchema: {
          type: 'object',
          properties: {
            skillId: { type: 'string', description: 'Skill ID' },
            name: { type: 'string', description: 'New name' },
            description: { type: 'string', description: 'New description' },
            category: { type: 'string', description: 'New category' },
            instructions: {
              type: 'string',
              description: 'New instructions',
            },
          },
          required: ['skillId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const skill = await this.skillsService.update(
            orgId,
            input.skillId as string,
            {
              name: input.name as string,
              description: input.description as string,
              category: input.category as string,
              instructions: input.instructions as string,
            },
          );
          return {
            content: JSON.stringify({
              id: skill.id,
              name: skill.name,
              message: `Skill "${skill.name}" updated.`,
            }),
          };
        },
      },
      {
        name: 'skill_delete',
        description: 'Delete a skill.',
        inputSchema: {
          type: 'object',
          properties: {
            skillId: { type: 'string', description: 'Skill ID' },
          },
          required: ['skillId'],
        },
        execute: async (orgId, _userId, input): Promise<McpToolResult> => {
          const skill = await this.skillsService.remove(
            orgId,
            input.skillId as string,
          );
          return {
            content: JSON.stringify({
              message: `Skill "${skill.name}" deleted.`,
            }),
          };
        },
      },
    ];
  }
}
