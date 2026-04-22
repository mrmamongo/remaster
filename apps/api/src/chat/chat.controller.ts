import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateChatDto, UpdateChatDto, ChatFilterSchema } from '@llm-platform/types/dto';
import { CreateChatCommand, UpdateChatCommand, DeleteChatCommand } from './handlers';
import { GetChatQuery, ListChatsQuery } from './handlers';

@ApiTags('Chats')
@ApiBearerAuth()
@Controller('chats')
export class ChatController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new chat' })
  async create(@Body() dto: CreateChatDto, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.commandBus.execute(
      new CreateChatCommand({
        userId,
        name: dto.name,
        agentId: dto.agentId,
      }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List user chats' })
  async list(@Query() filter: typeof ChatFilterSchema, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.queryBus.execute(
      new ListChatsQuery({
        userId,
        limit: filter.limit,
        offset: filter.offset,
        search: filter.search,
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat by ID' })
  async findById(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.queryBus.execute(
      new GetChatQuery({ id, userId }),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update chat' })
  async update(@Param('id') id: string, @Body() dto: UpdateChatDto, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.commandBus.execute(
      new UpdateChatCommand({
        id,
        userId,
        name: dto.name,
        agentId: dto.agentId,
      }),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete chat' })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.commandBus.execute(
      new DeleteChatCommand({ id, userId }),
    );
  }

  @Post(':id/clear')
  @ApiOperation({ summary: 'Clear chat messages' })
  async clear(@Param('id') id: string, @Req() req: Request) {
    // TODO: implement clear messages
    return { success: true };
  }
}