import { ICommand, ICommandHandler } from '@nestjs/cqrs';

export interface CreateChatCommandData {
  id: string;
  userId: string;
  name: string;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateChatCommand implements ICommand {
  constructor(public readonly data: CreateChatCommandData) {}
}

@Injectable()
export class CreateChatCommandHandler implements ICommandHandler<CreateChatCommand, any> {
  async execute(command: CreateChatCommand): Promise<any> {
    const { data } = command;
    // TODO: Save to database
    return {
      id: data.id,
      userId: data.userId,
      name: data.name,
      agentId: data.agentId || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}