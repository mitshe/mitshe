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
import {
  OrganizationId,
  UserId,
} from '../../../shared/decorators/organization.decorator';
import { ApiRateLimit } from '../../../shared/decorators/throttle.decorator';
import { ChatService } from '../services/chat.service';
import {
  CreateConversationDto,
  SendMessageDto,
  UpdateConversationDto,
} from '../dto/chat.dto';

@ApiTags('Chat')
@ApiBearerAuth('bearer')
@Controller('api/v1/chat')
@UseGuards(AuthGuard)
@ApiRateLimit()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  async createConversation(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    const conversation = await this.chatService.createConversation(
      organizationId,
      userId,
      dto,
    );
    return { conversation };
  }

  @Get('conversations')
  async findAllConversations(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const conversations = await this.chatService.findAllConversations(
      organizationId,
      userId,
    );
    return { conversations };
  }

  @Get('conversations/:id')
  async findConversation(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Param('id') id: string,
  ) {
    const conversation = await this.chatService.findConversation(
      organizationId,
      userId,
      id,
    );
    return { conversation };
  }

  @Patch('conversations/:id')
  async updateConversation(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const conversation = await this.chatService.updateConversation(
      organizationId,
      userId,
      id,
      dto,
    );
    return { conversation };
  }

  @Delete('conversations/:id')
  @HttpCode(204)
  async deleteConversation(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Param('id') id: string,
  ) {
    await this.chatService.deleteConversation(organizationId, userId, id);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const result = await this.chatService.sendMessage(
      organizationId,
      userId,
      id,
      dto,
    );
    return result;
  }
}
