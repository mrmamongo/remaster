import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ChatController } from './chat.controller';
import { ChatRepository, CHAT_REPOSITORY_TOKEN } from './repositories/chat-repo.interface';
import { 
  CreateChatInteractor,
  UpdateChatInteractor,
  DeleteChatInteractor,
  GetChatInteractor,
  ListChatsInteractor,
  EventBus,
} from './interactors/chat.interactors';
import { 
  CreateChatHandler, 
  UpdateChatHandler, 
  DeleteChatHandler,
  GetChatHandler,
  ListChatsHandler,
} from './handlers';

// Command handlers (thin - only dispatch)
const CommandHandlers = [
  CreateChatHandler,
  UpdateChatHandler,
  DeleteChatHandler,
];

// Query handlers (thin - only dispatch)
const QueryHandlers = [
  GetChatHandler,
  ListChatsHandler,
];

// Interactors (contain all business logic)
const Interactors = [
  CreateChatInteractor,
  UpdateChatInteractor,
  DeleteChatInteractor,
  GetChatInteractor,
  ListChatsInteractor,
];

// Repository (injected via token)
const Repositories = [
  {
    provide: CHAT_REPOSITORY_TOKEN,
    useClass: PrismaChatRepository, // реализация будет в infrastructure
  },
];

@Module({
  imports: [CqrsModule],
  controllers: [ChatController],
  providers: [
    ...Interactors,
    ...CommandHandlers,
    ...QueryHandlers,
    ...Repositories,
  ],
  exports: [ChatRepository],
})
export class ChatModule {}

// ============================================================================
// Placeholder -Real implementation will be in infrastructure layer
// ============================================================================

@Injectable()
class PrismaChatRepository implements ChatRepository {
  async findById(id: string): Promise<any> { return null; }
  async findByUserId(userId: string, filter: any): Promise<any[]> { return []; }
  async save(chat: any): Promise<any> { return chat; }
  async delete(id: string): Promise<void> {}
  async countByUserId(userId: string): Promise<number> { return 0; }
  async existsById(id: string): Promise<boolean> { return false; }
}