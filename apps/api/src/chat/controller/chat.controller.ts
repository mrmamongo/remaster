import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ChatService } from './service/chat.service';
import { CreateChatDto, UpdateChatDto, ChatFilterDto } from '@llm-platform/types/dto';

@ApiTags('Chats')
@ApiBearerAuth()
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create new chat' })
  async create(@Body() dto: CreateChatDto, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.chatService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user chats' })
  async list(@Query() filter: ChatFilterDto, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.chatService.findAll(userId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat by ID' })
  async findById(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.chatService.findById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update chat' })
  async update(@Param('id') id: string, @Body() dto: UpdateChatDto, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.chatService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete chat' })
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.chatService.delete(id, userId);
  }

  @Post(':id/clear')
  @ApiOperation({ summary: 'Clear chat messages' })
  async clear(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.['id'];
    // TODO: implement clear messages
    return { success: true };
  }
}