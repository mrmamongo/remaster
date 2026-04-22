import { DomainEvent } from '@llm-platform/types/events';

// ============================================================================
// Chat Domain Events
// ============================================================================

export class ChatCreatedEvent implements DomainEvent {
  readonly type = 'chat.created';
  
  constructor(
    public readonly chatId: string,
    public readonly userId: string,
    public readonly name: string,
  ) {}
}

export class ChatUpdatedEvent implements DomainEvent {
  readonly type = 'chat.updated';
  
  constructor(
    public readonly chatId: string,
    public readonly userId: string,
    public readonly changes: Record<string, unknown>,
  ) {}
}

export class ChatDeletedEvent implements DomainEvent {
  readonly type = 'chat.deleted';
  
  constructor(
    public readonly chatId: string,
    public readonly userId: string,
  ) {}
}

export class MessageSentEvent implements DomainEvent {
  readonly type = 'message.sent';
  
  constructor(
    public readonly messageId: string,
    public readonly chatId: string,
    public readonly userId: string,
    public readonly role: string,
    public readonly content: string | Record<string, unknown>,
    public readonly tokensUsed: number,
  ) {}
}

export class MessageStreamingStartEvent implements DomainEvent {
  readonly type = 'message.streaming.start';
  
  constructor(
    public readonly messageId: string,
    public readonly chatId: string,
  ) {}
}

export class MessageStreamingEndEvent implements DomainEvent {
  readonly type = 'message.streaming.end';
  
  constructor(
    public readonly messageId: string,
    public readonly chatId: string,
  ) {}
}