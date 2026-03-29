import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { WorkflowNode } from './types';

/**
 * NodeEnricherService
 *
 * Single Responsibility: Enrich node configs with data from database
 *
 * For example, data:get_repository nodes need repository details
 * that are stored in the database, not in the node config.
 */
@Injectable()
export class NodeEnricherService {
  private readonly logger = new Logger(NodeEnricherService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enrich node configs with database data
   */
  async enrich(
    organizationId: string,
    nodes: WorkflowNode[],
  ): Promise<WorkflowNode[]> {
    const enrichedNodes: WorkflowNode[] = [];

    for (const node of nodes) {
      const enrichedNode = await this.enrichNode(organizationId, node);
      enrichedNodes.push(enrichedNode);
    }

    return enrichedNodes;
  }

  private async enrichNode(
    organizationId: string,
    node: WorkflowNode,
  ): Promise<WorkflowNode> {
    // Only enrich specific node types
    switch (node.type) {
      case 'data:get_repository':
        return this.enrichRepositoryNode(organizationId, node);
      default:
        return node;
    }
  }

  private async enrichRepositoryNode(
    organizationId: string,
    node: WorkflowNode,
  ): Promise<WorkflowNode> {
    if (!node.config.repositoryId) {
      return node;
    }

    const repository = await this.prisma.repository.findFirst({
      where: {
        id: node.config.repositoryId as string,
        organizationId,
      },
    });

    if (!repository) {
      this.logger.warn(
        `Repository ${node.config.repositoryId} not found for node ${node.id}`,
      );
      return node;
    }

    this.logger.debug(
      `Enriched repository config for node ${node.id}: ${repository.fullPath}`,
    );

    return {
      ...node,
      config: {
        ...node.config,
        repositoryName: repository.name,
        repositoryFullPath: repository.fullPath,
        cloneUrl: repository.cloneUrl,
        defaultBranch: repository.defaultBranch,
        webUrl: repository.webUrl,
      },
    };
  }
}
