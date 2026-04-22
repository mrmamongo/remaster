import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Chat } from '../entities/chat.entity';
import { ChatRepository } from '../repositories/chat-repo.interface';
import { CreateChatInput, CreateChatOutput } from '../dto';
import { ChatCreatedEvent } from '../events/chat.events';
import { createId, now } from '@llm-platform/types/entities';

@Injectable()
export class CreateChatInteractor {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateChatInput): Promise<CreateChatOutput> {
    // 1. Create entity
    const chat = Chat.create({
      id: createId(),
      userId: input.userId,
      name: input.name,
      agentId: input.agentId,
      createdAt: now(),
      updatedAt: now(),
    });

    // 2. Persist
    const savedChat = await this.chatRepository.save(chat);

    // 3. Publish event
    await this.eventBus.publish(
      new ChatCreatedEvent({
        chatId: savedChat.id,
        userId: savedChat.userId,
        name: savedChat.name,
      }),
    );

    return { chat: savedChat.toJSON() };
  }
}

// ============================================================================
// EventBus stub (real implementation in infrastructure)
// ============================================================================

export interface EventBus {
  publish(event: unknown): Promise<void>;
}

// ============================================================================
// Delete Chat Interactor
// ============================================================================

export interface DeleteChatInput {
  id: string;
  userId: string;
}

export interface DeleteChatOutput {
  success: boolean;
}

@Injectable()
export class DeleteChatInteractor {
  constructor(
    private readonly chatRepository: ChatRepository,
  ) {}

  async execute(input: DeleteChatInput): Promise<DeleteChatOutput> {
    const chat = await this.chatRepository.findById(input.id);
    
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.userId !== input.userId) {
      throw new UnauthorizedException('Not authorized to delete this chat');
    }

    await this.chatRepository.delete(input.id);

    return { success: true };
  }
}

// ============================================================================
// Get Chat Interactor
// ============================================================================

export interface GetChatInput {
  id: string;
  userId: string;
}

export interface GetChatOutput {
  chat: ReturnType<Chat['toJSON']>;
}

@Injectable()
export class GetChatInteractor {
  constructor(
    private readonly chatRepository: ChatRepository,
  ) {}

  async execute(input: GetChatInput): Promise<GetChatOutput> {
    const chat = await this.chatRepository.findById(input.id);
    
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.userId !== input.userId) {
      throw new UnauthorizedException('Not authorized to view this chat');
    }

    return { chat: chat.toJSON() };
  }
}

// ============================================================================
// List Chats Interactor
// ============================================================================

export interface ListChatsInput {
  userId: string;
  limit: number;
  offset: number;
  search?: string;
}

export interface ListChatsOutput {
  chats: ReturnType<Chat['toJSON'][];
  total: number;
}

@Injectable()
export class ListChatsInteractor {
  constructor(
    private readonly chatRepository: ChatRepository,
  ) {}

  async execute(input: ListChatsInput): Promise<ListChatsOutput> {
    const chats = await this.chatRepository.findByUserId(input.userId, {
      limit: input.limit,
      offset: input.offset,
      search: input.search,
    });
    
    const total = await this.chatRepository.countByUserId(input.userId);

    return {
      chats: chats.map(chat => chat.toJSON()),
      total,
    };
  }
}

// ============================================================================
// Update Chat Interactor
// ============================================================================

export interface UpdateChatInput {
  id: string;
  userId: string;
  name?: string;
  agentId?: string | null;
}

export interface UpdateChatOutput {
  chat: ReturnType<Chat['toJSON']>;
}

@Injectable()
export class UpdateChatInteractor {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: UpdateChatInput): Promise<UpdateChatOutput> {
    const chat = await this.chatRepository.findById(input.id);
    
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.userId !== input.userId) {
      throw new UnauthorizedException('Not authorized to update this chat');
    }

    chat.update({
      name: input.name,
      agentId: input.agentId,
      updatedAt: now(),
    });

    const savedChat = await this.chatRepository.save(chat);

    await this.eventBus.publish(
      new ChatUpdatedEvent({
        chatId: savedChat.id,
        userId: savedChat.userId,
        changes: {
          name: input.name,
          agentId: input.agentId,
        },
      }),
    );

    return { chat: savedChat.toJSON() };
  }
}