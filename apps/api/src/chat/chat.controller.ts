import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res, Sse, Header, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExtraModels } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { CreateChatDto, UpdateChatDto, ChatFilterSchema } from '@llm-platform/types/dto';
import { CreateChatCommand, UpdateChatCommand, DeleteChatCommand } from './handlers';
import { GetChatQuery, ListChatsQuery } from './handlers';
import { ChatResponseDto, ChatListResponseDto, ErrorResponseDto } from './dto/responses';

// =============================================================================
// PRESENTATION LAYER
// All mapping, streaming, and HTTP-specific logic stays HERE
// =============================================================================

@ApiTags('Chats')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponseDto)
@Controller('chats')
export class ChatController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // =============================================================================
  // CREATE CHAT - Presentation handles mapping
  // =============================================================================

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create new chat' })
  async create(
    @Body() dto: CreateChatDto, 
    @Req() req: Request,
  ): Promise<ChatResponseDto> {
    const userId = this.extractUserId(req);
    
    const result = await this.commandBus.execute(
      new CreateChatCommand({
        userId,
        name: dto.name,
        agentId: dto.agentId,
      }),
    );

    // Mapping happens in presentation layer
    return this.toChatResponse(result.chat);
  }

  // =============================================================================
  // LIST CHATS - Pagination, search mapping
  // =============================================================================

  @Get()
  @ApiOperation({ summary: 'List user chats' })
  async list(
    @Query() filter: typeof ChatFilterSchema, 
    @Req() req: Request,
  ): Promise<ChatListResponseDto> {
    const userId = this.extractUserId(req);
    
    const result = await this.queryBus.execute(
      new ListChatsQuery({
        userId,
        limit: filter.limit ?? 20,
        offset: filter.offset ?? 0,
        search: filter.search,
      }),
    );

    return {
      chats: result.chats.map(c => this.toChatResponse(c)),
      total: result.total,
      limit: filter.limit ?? 20,
      offset: filter.offset ?? 0,
    };
  }

  // =============================================================================
  // GET CHAT - Single entity mapping
  // =============================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Get chat by ID' })
  async findById(
    @Param('id') id: string, 
    @Req() req: Request,
  ): Promise<ChatResponseDto> {
    const userId = this.extractUserId(req);
    
    const result = await this.queryBus.execute(
      new GetChatQuery({ id, userId }),
    );

    return this.toChatResponse(result.chat);
  }

  // =============================================================================
  // UPDATE CHAT - Partial update mapping
  // =============================================================================

  @Patch(':id')
  @ApiOperation({ summary: 'Update chat' })
  async update(
    @Param('id') id: string, 
    @Body() dto: UpdateChatDto, 
    @Req() req: Request,
  ): Promise<ChatResponseDto> {
    const userId = this.extractUserId(req);
    
    const result = await this.commandBus.execute(
      new UpdateChatCommand({
        id,
        userId,
        name: dto.name,
        agentId: dto.agentId,
      }),
    );

    return this.toChatResponse(result.chat);
  }

  // =============================================================================
  // DELETE CHAT
  // =============================================================================

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete chat' })
  async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = this.extractUserId(req);
    
    await this.commandBus.execute(
      new DeleteChatCommand({ id, userId }),
    );
  }

  // =============================================================================
  // CLEAR CHAT - Presentation only
  // =============================================================================

  @Post(':id/clear')
  @HttpCode(204)
  @ApiOperation({ summary: 'Clear chat messages' })
  async clear(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = this.extractUserId(req);
    // TODO: implement clear messages
    // This is presentation logic - could be SSE streaming for progress
  }

  // =============================================================================
  // SEND MESSAGE WITH STREAMING - Streaming handled HERE, not in interactor
  // =============================================================================

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send message to chat (supports streaming)' })
  async sendMessage(
    @Param('id') chatId: string,
    @Body() dto: { content: string; stream?: boolean },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = this.extractUserId(req);

    // STREAMING IS PRESENTATION LOGIC - happens in controller/response
    if (dto.stream) {
      return this.handleStreamingMessage(chatId, userId, dto.content, res);
    }

    // Non-streaming: regular response
    const result = await this.commandBus.execute(
      new SendMessageCommand({
        chatId,
        userId,
        content: dto.content,
        stream: false,
      }),
    );

    return this.toMessageResponse(result.message);
  }

  // =============================================================================
  // SSE ENDPOINT - Streaming handled HERE (presentation)
  // =============================================================================

  @Get(':id/stream')
  @Sse()
  streamMessages(
    @Param('id') chatId: string,
    @Req() req: Request,
  ): Observable<any> {
    const userId = this.extractUserId(req);
    
    // This observable is built in PRESENTATION layer
    // Interactor doesn't know about SSE
    return this.buildSSEStream(chatId, userId);
  }

  // =============================================================================
  // PRIVATE HELPERS - Presentation layer concerns
  // =============================================================================

  private extractUserId(req: Request): string {
    return req.user?.['id'] ?? req.headers['x-user-id'] as string;
  }

  /**
   * PRESENTATION: Map domain entity to API response
   * Domain doesn't know about this format
   */
  private toChatResponse(chat: any): ChatResponseDto {
    return {
      id: chat.id,
      name: chat.name,
      agentId: chat.agentId,
      userId: chat.userId,
      createdAt: chat.createdAt instanceof Date 
        ? chat.createdAt.toISOString() 
        : chat.createdAt,
      updatedAt: chat.updatedAt instanceof Date 
        ? chat.updatedAt.toISOString() 
        : chat.updatedAt,
      metadata: chat.metadata ?? {},
    };
  }

  private toMessageResponse(message: any): any {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : message.createdAt,
    };
  }

  /**
   * PRESENTATION: Handle streaming response
   * Interactor returns an async iterator, controller handles HTTP streaming
   */
  private async handleStreamingMessage(
    chatId: string,
    userId: string,
    content: string,
    res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await this.commandBus.execute(
        new SendMessageCommand({
          chatId,
          userId,
          content,
          stream: true,
        }),
      );

      // Stream chunks to HTTP response - PRESENTATION logic
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  /**
   * PRESENTATION: Build SSE observable
   * Interactor doesn't know about SSE format
   */
  private buildSSEStream(chatId: string, userId: string): Observable<any> {
    const subject = new Subject<any>();

    // Subscribe to message events and format as SSE
    // This is PRESENTATION logic - transforming domain events to SSE format
    this.subscribeToMessages(chatId, userId)
      .pipe(
        map(event => ({
          type: event.type,
          data: JSON.stringify(event.data),
        })),
        takeUntil(subject),
      )
      .subscribe({
        next: (data) => subject.next(data),
        error: (err) => subject.error(err),
      });

    return subject.asObservable();
  }

  private subscribeToMessages(chatId: string, userId: string): Observable<any> {
    // TODO: Subscribe to NATS subject for real-time messages
    return new Observable(observer => {
      // Placeholder for NATS subscription
    });
  }
}

// =============================================================================
// Type helpers
// =============================================================================

interface Observable<T> {
  subscribe(options: { next: (value: T) => void; error: (err: Error) => void }): void;
}