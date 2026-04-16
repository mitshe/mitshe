import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { SessionContainerService } from '../../sessions/services/session-container.service';
import { CreateImageDto, UpdateImageDto } from '../dto/image.dto';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly containerService: SessionContainerService,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateImageDto) {
    const session = await this.prisma.agentSession.findFirst({
      where: { id: dto.sessionId, organizationId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.containerId) {
      throw new BadRequestException('Session has no running container');
    }

    const imageRecord = await this.prisma.baseImage.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        dockerImage: '', // will be set after commit
        sourceSessionId: dto.sessionId,
        enableDocker: session.enableDocker,
        createdBy: userId,
      },
    });

    // Commit container to persistent image (async heavy work)
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setImmediate(async () => {
      try {
        // commitContainer returns image name like "mitshe-clone:{id}"
        const dockerImageName = await this.containerService.commitContainer(
          session.containerId!,
          imageRecord.id,
        );

        await this.prisma.baseImage.update({
          where: { id: imageRecord.id },
          data: { dockerImage: dockerImageName },
        });

        this.logger.log(
          `Base image "${dto.name}" created from session ${dto.sessionId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create base image: ${(error as Error).message}`,
        );
        await this.prisma.baseImage.delete({
          where: { id: imageRecord.id },
        });
      }
    });

    return imageRecord;
  }

  async findAll(organizationId: string) {
    return this.prisma.baseImage.findMany({
      where: { organizationId },
      include: {
        sourceSession: { select: { id: true, name: true } },
        parentImage: { select: { id: true, name: true } },
        _count: { select: { sessions: true, childImages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const image = await this.prisma.baseImage.findFirst({
      where: { id, organizationId },
      include: {
        sourceSession: { select: { id: true, name: true } },
        parentImage: { select: { id: true, name: true } },
        childImages: { select: { id: true, name: true } },
        sessions: { select: { id: true, name: true, status: true } },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    return image;
  }

  async update(organizationId: string, id: string, dto: UpdateImageDto) {
    const image = await this.findOne(organizationId, id);

    return this.prisma.baseImage.update({
      where: { id: image.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const image = await this.findOne(organizationId, id);

    // Remove Docker image
    if (image.dockerImage) {
      try {
        await this.containerService.removeImage(image.dockerImage);
      } catch (error) {
        this.logger.warn(
          `Failed to remove Docker image ${image.dockerImage}: ${(error as Error).message}`,
        );
      }
    }

    return this.prisma.baseImage.delete({ where: { id: image.id } });
  }
}
