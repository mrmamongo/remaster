// =============================================================================
// Presentation DTOs - API Response formats
// These stay in the presentation layer and are NOT known by domain/interactors
// =============================================================================

import { z } from 'zod';

// =============================================================================
// Chat Responses
// =============================================================================

export const ChatResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  agentId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ChatResponseDto = z.infer<typeof ChatResponseSchema>;

export const ChatListResponseSchema = z.object({
  chats: z.array(ChatResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type ChatListResponseDto = z.infer<typeof ChatListResponseSchema>;

// =============================================================================
// Message Responses
// =============================================================================

export const MessageResponseSchema = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system', 'tool', 'reasoning', 'activity']),
  content: z.union([z.string(), z.record(z.string(), z.any())]),
  model: z.string().optional(),
  tokensUsed: z.number().optional(),
  createdAt: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type MessageResponseDto = z.infer<typeof MessageResponseSchema>;

// =============================================================================
// Error Responses
// =============================================================================

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().datetime(),
});

export type ErrorResponseDto = z.infer<typeof ErrorResponseSchema>;

// =============================================================================
// Streaming Chunk Response
// =============================================================================

export const StreamChunkSchema = z.object({
  type: z.enum(['content', 'reasoning', 'tool_call', 'tool_result', 'done', 'error']),
  content: z.string().optional(),
  delta: z.string().optional(),
  tool: z.object({
    name: z.string(),
    arguments: z.record(z.string(), z.any()),
  }).optional(),
  toolResult: z.record(z.string(), z.any()).optional(),
  tokensUsed: z.number().optional(),
  done: z.boolean().optional(),
  error: z.string().optional(),
});

export type StreamChunkDto = z.infer<typeof StreamChunkSchema>;