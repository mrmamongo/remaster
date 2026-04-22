import { Chat, ChatFilter, ChatRecord } from '../entities/chat.entity';

export interface ChatRepository {
  findById(id: string): Promise<Chat | null>;
  findByUserId(userId: string, filter: ChatFilter): Promise<Chat[]>;
  save(chat: Chat): Promise<Chat>;
  delete(id: string): Promise<void>;
  countByUserId(userId: string): Promise<number>;
  existsById(id: string): Promise<boolean>;
}

export interface ChatRepositoryToken {
  provide: string;
}
export const CHAT_REPOSITORY_TOKEN: ChatRepositoryToken = { provide: 'ChatRepository' };