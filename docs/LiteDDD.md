# LiteDDD Architecture - LLM Platform

## Overview

LiteDDD (Lite Domain-Driven Design) — упрощённый DDD для монолита с TypeScript/NestJS.

## Core Principles

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Presentation Layer (Controllers)                                │
│  • Request/Response mapping                                      │
│  • HTTP streaming                                                │
│  • Error formatting                                              │
│  • THIS IS WHERE PRESENTATION LOGIC LIVES                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Application Layer (CQRS)                                        │
│  Handler (Command/Query) — dispatch ONLY, NO logic              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Domain Layer (Interactors)                                       │
│  • Business logic                                                │
│  • Entity operations                                             │
│  • Domain events                                                 │
│  • NO knowledge of HTTP, streaming, or presentation              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Infrastructure Layer (Repositories)                             │
│  • Database access                                               │
│  • External services                                             │
│  • Caching                                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Rules

**Controller = Presentation Logic ONLY:**
- Extract DTO from request
- Map to command/query input
- Call handler
- **Handle streaming** (SSE, chunked responses)
- **Map response to API format**
- **Format errors to HTTP responses**

**Handler = CQRS Dispatch ONLY:**
- Extract data from command/query
- Call interactor
- Return result
- NO business logic, NO HTTP knowledge

**Interactor = Business Logic ONLY:**
- Validation
- Entity creation/updates
- Domain events
- Call repository
- NO HTTP knowledge, NO streaming

---

## 2. Directory Structure

```
domain/
├── chat/
│   ├── chat.module.ts           # NestJS module
│   ├── commands/              # CQRS Commands
│   │   ├── create-chat.command.ts
│   │   └── create-chat.handler.ts
│   ├── queries/              # CQRS Queries
│   │   ├── get-chat.query.ts
│   │   └── get-chat.handler.ts
│   ├── interactors/          #Interactors (вот где ЛОГИКА)
│   │   ├── create-chat.interactor.ts
│   │   ├── get-chat.interactor.ts
│   │   └── list-chats.interactor.ts
│   ├── repositories/         # Data access
│   │   ├── chat-repo.interface.ts
│   │   └── prisma-chat.repository.ts
│   ├── entities/             # Domain entities
│   │   └── chat.entity.ts
│   ├── events/               # Domain events
│   │   └── chat.events.ts
│   ├── dto/                 # Domain DTOs
│   │   └── index.ts
│   └── services/            # Domain services (если нужно)
│       └── chat.service.ts
```

---

## 3. Handler Template

```typescript
// commands/create-chat.handler.ts
@Injectable()
export class CreateChatHandler implements ICommandHandler<CreateChatCommand, Chat> {
  constructor(
    private readonly createChatInteractor: CreateChatInteractor,
  ) {}

  async execute(command: CreateChatCommand): Promise<Chat> {
    // НЕТ ЛОГИКИ - только вызов интерактора
    return this.createChatInteractor.execute(command.data);
  }
}
```

---

## 4. Interactor Template

```typescript
// interactors/create-chat.interactor.ts
export class CreateChatInput {
  @IsString() @IsNotEmpty()
  name: string;
  
  @IsUUID()
  userId: string;
  
  @IsUUID()
  @IsOptional()
  agentId?: string;
}

export class CreateChatOutput {
  chat: Chat;
}

@Injectable()
export class CreateChatInteractor {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly eventBus: EventBus,
    private readonly oryService: OryService,
  ) {}

  async execute(input: CreateChatInput): Promise<CreateChatOutput> {
    // 1. Валидация (если нужна)
    await this.validateUserExists(input.userId);
    
    // 2. Проверка прав (Ory)
    await this.oryService.checkPermission({
      resource: 'chat',
      relation: 'create',
      subject: input.userId,
    });
    
    // 3. Создание сущности
    const chat = Chat.create({
      id: createId(),
      userId: input.userId,
      name: input.name,
      agentId: input.agentId,
      createdAt: now(),
      updatedAt: now(),
    });
    
    // 4. Сохранение
    await this.chatRepository.save(chat);
    
    // 5. Публикация события
    await this.eventBus.publish(
      new ChatCreatedEvent({
        chatId: chat.id,
        userId: chat.userId,
        name: chat.name,
      }),
    );
    
    return { chat };
  }
  
  private async validateUserExists(userId: string) {
    // ...
  }
}
```

---

## 5. Repository Interface

```typescript
// repositories/chat-repo.interface.ts
export interface ChatRepository {
  findById(id: string): Promise<Chat | null>;
  findByUserId(userId: string, filter: ChatFilter): Promise<Chat[]>;
  save(chat: Chat): Promise<Chat>;
  delete(id: string): Promise<void>;
  countByUserId(userId: string): Promise<number>;
}

// repositories/prisma-chat.repository.ts
@Injectable()
export class PrismaChatRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaService) {}
  
  async findById(id: string): Promise<Chat | null> {
    const record = await this.prisma.chat.findUnique({ where: { id } });
    return record ? Chat.fromPrisma(record) : null;
  }
  
  // ...
}
```

---

## 6. Entity Template

```typescript
// entities/chat.entity.ts
export class Chat {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly agentId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly metadata: Record<string, any>;

  private constructor(props: ChatProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.name = props.name;
    this.agentId = props.agentId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.metadata = props.metadata;
  }

  static create(props: CreateChatProps): Chat {
    // Business logic here
    return new Chat(props);
  }

  static fromPrisma(record: Prisma.Chat): Chat {
    return new Chat({
      id: record.id,
      userId: record.userId,
      name: record.name,
      // ...
    });
  }
}
```

---

## 7. Events (Domain Events)

```typescript
// events/chat.events.ts
export class ChatCreatedEvent implements DomainEvent {
  readonly type = 'chat.created';
  
  constructor(
    public readonly chatId: string,
    public readonly userId: string,
    public readonly name: string,
  ) {}
}
```

---

## 8. Dependency Injection

```typescript
// chat.module.ts
@Module({
  imports: [CqrsModule],
  controllers: [ChatController],
  providers: [
    // Interactors
    CreateChatInteractor,
    GetChatInteractor,
    ListChatsInteractor,
    
    // Handlers
    CreateChatHandler,
    GetChatHandler,
    ListChatsHandler,
    
    // Repository
    {
      provide: ChatRepository,
      useClass: PrismaChatRepository,
    },
  ],
})
export class ChatModule {}
```

---

## 9. Testing

```typescript
// interactors/create-chat.interactor.spec.ts
describe('CreateChatInteractor', () => {
  let interactor: CreateChatInteractor;
  let mockRepository: jest.Mocked<ChatRepository>;
  let mockEventBus: jest.Mocked<EventBus>;
  
  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    };
    mockEventBus = {
      publish: jest.fn(),
    };
    
    interactor = new CreateChatInteractor(
      mockRepository,
      mockEventBus,
    );
  });
  
  it('should create chat and publish event', async () => {
    const input: CreateChatInput = {
      name: 'Test Chat',
      userId: 'user-123',
    };
    
    const result = await interactor.execute(input);
    
    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: result.chat.id }),
    );
  });
});
```

---

## 10. Summary

| Layer | Responsibility |
|-------|----------------|
| Controller | HTTP, извлечение DTO |
| Handler | CQRS dispatch, нет логики |
| **Interactor** | **Вся бизнес-логика** |
| Repository | CRUD операции |
| Entity | Доменная модель |
| Event | доменные события |

**Ключевое правило:** Interactor = один use case = одна операция. Никаких "супер-сервисов" на 500 строк.