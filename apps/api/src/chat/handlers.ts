import { Injectable } from '@nestjs/common';
import { ICommand, ICommandHandler, IQuery, IQueryHandler } from '@nestjs/cqrs';
import { 
  CreateChatInteractor, 
  CreateChatInput, 
  CreateChatOutput,
  UpdateChatInteractor,
  UpdateChatInput,
  UpdateChatOutput,
  DeleteChatInteractor,
  DeleteChatInput,
  DeleteChatOutput,
  GetChatInteractor,
  GetChatInput,
  GetChatOutput,
  ListChatsInteractor,
  ListChatsInput,
  ListChatsOutput,
} from './interactors/chat.interactors';

// ============================================================================
// Commands
// ============================================================================

export class CreateChatCommand implements ICommand {
  static readonly type = 'chat.create';
  
  constructor(
    public readonly input: CreateChatInput,
  ) {}
}

export class UpdateChatCommand implements ICommand {
  static readonly type = 'chat.update';
  
  constructor(
    public readonly input: UpdateChatInput,
  ) {}
}

export class DeleteChatCommand implements ICommand {
  static readonly type = 'chat.delete';
  
  constructor(
    public readonly input: DeleteChatInput,
  ) {}
}

// ============================================================================
// Queries
// ============================================================================

export class GetChatQuery implements IQuery {
  static readonly type = 'chat.get';
  
  constructor(
    public readonly input: GetChatInput,
  ) {}
}

export class ListChatsQuery implements IQuery {
  static readonly type = 'chat.list';
  
  constructor(
    public readonly input: ListChatsInput,
  ) {}
}

// ============================================================================
// Command Handlers (NO LOGIC - only dispatch)
// ============================================================================

@Injectable()
export class CreateChatHandler implements ICommandHandler<CreateChatCommand, CreateChatOutput> {
  constructor(private readonly interactor: CreateChatInteractor) {}

  async execute(command: CreateChatCommand): Promise<CreateChatOutput> {
    return this.interactor.execute(command.input);
  }
}

@Injectable()
export class UpdateChatHandler implements ICommandHandler<UpdateChatCommand, UpdateChatOutput> {
  constructor(private readonly interactor: UpdateChatInteractor) {}

  async execute(command: UpdateChatCommand): Promise<UpdateChatOutput> {
    return this.interactor.execute(command.input);
  }
}

@Injectable()
export class DeleteChatHandler implements ICommandHandler<DeleteChatCommand, DeleteChatOutput> {
  constructor(private readonly interactor: DeleteChatInteractor) {}

  async execute(command: DeleteChatCommand): Promise<DeleteChatOutput> {
    return this.interactor.execute(command.input);
  }
}

// ============================================================================
// Query Handlers (NO LOGIC - only dispatch)
// ============================================================================

@Injectable()
export class GetChatHandler implements IQueryHandler<GetChatQuery, GetChatOutput> {
  constructor(private readonly interactor: GetChatInteractor) {}

  async execute(query: GetChatQuery): Promise<GetChatOutput> {
    return this.interactor.execute(query.input);
  }
}

@Injectable()
export class ListChatsHandler implements IQueryHandler<ListChatsQuery, ListChatsOutput> {
  constructor(private readonly interactor: ListChatsInteractor) {}

  async execute(query: ListChatsQuery): Promise<ListChatsOutput> {
    return this.interactor.execute(query.input);
  }
}