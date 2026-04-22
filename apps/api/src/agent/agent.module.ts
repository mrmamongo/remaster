import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

const CommandHandlers = [];
const QueryHandlers = [];

@Module({
  imports: [CqrsModule],
  controllers: [],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [],
})
export class AgentModule {}