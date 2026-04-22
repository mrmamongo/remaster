import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { CreateChatDto, UpdateChatDto, ChatFilterDto, SendMessageDto } from '@llm-platform/types/dto';
import { Chat, Message } from '@llm-platform/types/entities';
import { createId, now } from '@llm-platform/types/entities';
import { CreateChatCommand } from './commands/create-chat.command';
import { UpdateChatCommand } from './commands/update-chat.command';
import { DeleteChatCommand } from './commands/delete-chat.command';
import { GetChatQuery } from './queries/get-chat.query';
import { ListChatsQuery } from './queries/list-chats.query';
import { SendMessageCommand } from './commands/send-message.command';

@Injectable()
export class ChatService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, dto: CreateChatDto): Promise<Chat> {
    return this.commandBus.execute(
      new CreateChatCommand({
        id: createId(),
        userId,
        name: dto.name,
        agentId: dto.agentId,
        createdAt: now(),
        updatedAt: now(),
      }),
    );
  }

  async update(chatId: string, userId: string, dto: UpdateChatDto): Promise<Chat> {
    const chat = await this.findById(chatId, userId);
    if (chat.userId !== userId) {
      throw new UnauthorizedException('You can only update your own chats');
    }

    return this.commandBus.execute(
      new UpdateChatCommand({
        id: chatId,
        ...dto,
        updatedAt: now(),
      }),
    );
  }

  async delete(chatId: string, userId: string): Promise<void> {
    const chat = await this.findById(chatId, userId);
    if (chat.userId !== userId) {
      throw new UnauthorizedException('You can only delete your own chats');
    }

    return this.commandBus.execute(new DeleteChatCommand({ id: chatId }));
  }

  async findById(chatId: string, userId: string): Promise<Chat> {
    try {
      return await this.queryBus.execute(new GetChatQuery({ id: chatId, userId }));
    } catch {
      throw new NotFoundException('Chat not found');
    }
  }

  async findAll(userId: string, filter: ChatFilterDto) {
    return this.queryBus.execute(
      new ListChatsQuery({
        userId,
        limit: filter.limit,
        offset: filter.offset,
        search: filter.search,
      }),
    );
  }

  async sendMessage(chatId: string, userId: string, dto: SendMessageDto) {
    const chat = await this.findById(chatId, userId);
    
    return this.commandBus.execute(
      new SendMessageCommand({
        chatId,
        userId,
        content: dto.content,
        modelOverride: dto.modelOverride,
        temperature: dto.temperature,
        stream: dto.stream,
      }),
    );
  }
}