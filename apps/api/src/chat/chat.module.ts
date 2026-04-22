import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CreateChatHandler } from './commands/create-chat.handler';
import { UpdateChatHandler } from './commands/update-chat.handler';
import { DeleteChatHandler } from './commands/delete-chat.handler';
import { GetChatHandler } from './queries/get-chat.handler';
import { ListChatsHandler } from './queries/list-chats.handler';

const CommandHandlers = [CreateChatHandler, UpdateChatHandler, DeleteChatHandler];
const QueryHandlers = [GetChatHandler, ListChatsHandler];

@Module({
  imports: [CqrsModule],
  controllers: [ChatController],
  providers: [ChatService, ...CommandHandlers, ...QueryHandlers],
  exports: [ChatService],
})
export class ChatModule {}