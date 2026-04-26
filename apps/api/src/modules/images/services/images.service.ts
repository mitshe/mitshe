import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { SessionContainerService } from '../../sessions/services/session-container.service';
import { EventsGateway } from '../../../infrastructure/websocket/events.gateway';
import { CreateImageDto, UpdateImageDto } from '../dto/image.dto';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly containerService: SessionContainerService,
    private readonly eventsGateway: EventsGateway,
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

    const snapshot = await this.prisma.baseImage.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        dockerImage: '',
        status: 'CREATING',
        sourceSessionId: dto.sessionId,
        enableDocker: session.enableDocker,
        createdBy: userId,
      },
    });

    const containerId = session.containerId;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setImmediate(async () => {
      try {
        const dockerImageName = await this.containerService.commitContainer(
          containerId,
          snapshot.id,
        );

        const sizeBytes =
          await this.containerService.getImageSize(dockerImageName);

        await this.prisma.baseImage.update({
          where: { id: snapshot.id },
          data: {
            dockerImage: dockerImageName,
            status: 'READY',
            sizeBytes,
          },
        });

        this.eventsGateway.emitSnapshotStatus(
          organizationId,
          snapshot.id,
          'READY',
        );
        this.logger.log(
          `Snapshot "${dto.name}" created from session ${dto.sessionId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create snapshot: ${(error as Error).message}`,
        );
        await this.prisma.baseImage.update({
          where: { id: snapshot.id },
          data: { status: 'FAILED' },
        });
        this.eventsGateway.emitSnapshotStatus(
          organizationId,
          snapshot.id,
          'FAILED',
          (error as Error).message,
        );
      }
    });

    return snapshot;
  }

  private serializeBigInt<T extends Record<string, unknown>>(obj: T) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        typeof v === 'bigint' ? v.toString() : v,
      ]),
    );
  }

  async findAll(organizationId: string) {
    const snapshots = await this.prisma.baseImage.findMany({
      where: { organizationId },
      include: {
        sourceSession: { select: { id: true, name: true } },
        parentImage: { select: { id: true, name: true } },
        _count: { select: { sessions: true, childImages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return snapshots.map((s) => this.serializeBigInt(s));
  }

  async findOne(organizationId: string, id: string) {
    const snapshot = await this.prisma.baseImage.findFirst({
      where: { id, organizationId },
      include: {
        sourceSession: { select: { id: true, name: true } },
        parentImage: { select: { id: true, name: true } },
        childImages: { select: { id: true, name: true } },
        sessions: { select: { id: true, name: true, status: true } },
      },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }

    return this.serializeBigInt(snapshot);
  }

  async update(organizationId: string, id: string, dto: UpdateImageDto) {
    await this.findOne(organizationId, id);

    const updated = await this.prisma.baseImage.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return this.serializeBigInt(updated);
  }

  async remove(organizationId: string, id: string) {
    const snapshot = await this.findOne(organizationId, id);

    if (snapshot.dockerImage) {
      try {
        await this.containerService.removeImage(snapshot.dockerImage as string);
      } catch (error) {
        this.logger.warn(
          `Failed to remove Docker image ${snapshot.dockerImage}: ${(error as Error).message}`,
        );
      }
    }

    const deleted = await this.prisma.baseImage.delete({ where: { id } });
    return this.serializeBigInt(deleted);
  }
}
