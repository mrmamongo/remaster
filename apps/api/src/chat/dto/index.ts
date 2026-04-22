import { z } from 'zod';

// ============================================================================
// Create Chat DTO
// ============================================================================

export const CreateChatDtoSchema = z.object({
  name: z.string().min(1).max(200),
  agentId: z.string().uuid().optional(),
});

export type CreateChatDto = z.infer<typeof CreateChatDtoSchema>;

// ============================================================================
// Update Chat DTO
// ============================================================================

export const UpdateChatDtoSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  agentId: z.string().uuid().nullable().optional(),
});

export type UpdateChatDto = z.infer<typeof UpdateChatDtoSchema>;

// ============================================================================
// Send Message DTO
// ============================================================================

export const SendMessageDtoSchema = z.object({
  content: z.union([z.string(), z.record(z.string(), z.any())]),
  modelOverride: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().default(false),
});

export type SendMessageDto = z.infer<typeof SendMessageDtoSchema>;

// ============================================================================
// Interactor Inputs
// ============================================================================

export interface CreateChatInput {
  userId: string;
  name: string;
  agentId?: string;
}

export interface UpdateChatInput {
  id: string;
  userId: string;
  name?: string;
  agentId?: string | null;
}

export interface DeleteChatInput {
  id: string;
  userId: string;
}

export interface GetChatInput {
  id: string;
  userId: string;
}

export interface ListChatsInput {
  userId: string;
  limit: number;
  offset: number;
  search?: string;
}

export interface SendMessageInput {
  chatId: string;
  userId: string;
  content: string | Record<string, any>;
  modelOverride?: string;
  temperature?: number;
  stream: boolean;
}

// ============================================================================
// Interactor Outputs
// ============================================================================

export interface CreateChatOutput {
  chat: ReturnType<Chat['toJSON']>;
}

export interface UpdateChatOutput {
  chat: ReturnType<Chat['toJSON']>;
}

export interface DeleteChatOutput {
  success: boolean;
}

export interface GetChatOutput {
  chat: ReturnType<Chat['toJSON']>;
}

export interface ListChatsOutput {
  chats: ReturnType<Chat['toJSON'][];
  total: number;
}

export interface SendMessageOutput {
  message: unknown; // Message entity
  stream?: boolean;
}