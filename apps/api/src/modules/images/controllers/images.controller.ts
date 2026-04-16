import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../shared/auth';
import { OrganizationId } from '../../../shared/decorators/organization.decorator';
import { UserId } from '../../../shared/decorators/organization.decorator';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';
import { ImagesService } from '../services/images.service';
import { CreateImageDto, UpdateImageDto } from '../dto/image.dto';

@ApiTags('Images')
@ApiBearerAuth('bearer')
@Controller('api/v1/images')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreateImageDto,
  ) {
    const image = await this.imagesService.create(organizationId, userId, dto);
    return { image };
  }

  @Get()
  async findAll(@OrganizationId() organizationId: string) {
    const images = await this.imagesService.findAll(organizationId);
    return { images };
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    const image = await this.imagesService.findOne(organizationId, id);
    return { image };
  }

  @Patch(':id')
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateImageDto,
  ) {
    const image = await this.imagesService.update(organizationId, id, dto);
    return { image };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    await this.imagesService.remove(organizationId, id);
  }
}
