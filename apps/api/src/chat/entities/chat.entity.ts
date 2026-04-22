import { z } from 'zod';

// ============================================================================
// Entity Props
// ============================================================================

export interface ChatProps {
  id: string;
  userId: string;
  name: string;
  agentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateChatProps {
  id: string;
  userId: string;
  name: string;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateChatProps {
  name?: string;
  agentId?: string | null;
  updatedAt: Date;
}

// ============================================================================
// Chat Entity
// ============================================================================

export class Chat {
  private readonly _id: string;
  private readonly _userId: string;
  private _name: string;
  private _agentId: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private readonly _metadata: Record<string, unknown>;

  private constructor(props: ChatProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._name = props.name;
    this._agentId = props.agentId;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._metadata = props.metadata || {};
  }

  // ========================================================================
  // Static Factory
  // ========================================================================

  static create(props: CreateChatProps): Chat {
    return new Chat({
      id: props.id,
      userId: props.userId,
      name: props.name,
      agentId: props.agentId || null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      metadata: props.metadata,
    });
  }

  static fromPersistence(record: ChatRecord): Chat {
    return new Chat({
      id: record.id,
      userId: record.userId,
      name: record.name,
      agentId: record.agentId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      metadata: record.metadata as Record<string, unknown>,
    });
  }

  // ========================================================================
  // Getters
  // ========================================================================

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get name(): string { return this._name; }
  get agentId(): string | null { return this._agentId; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get metadata(): Record<string, unknown> { return this._metadata; }

  // ========================================================================
  // Business Logic
  // ========================================================================

  update(props: UpdateChatProps): void {
    if (props.name !== undefined) {
      this._name = props.name;
    }
    if (props.agentId !== undefined) {
      this._agentId = props.agentId;
    }
    this._updatedAt = props.updatedAt;
  }

  // ========================================================================
  // Serialization
  // ========================================================================

  toJSON(): ChatJSON {
    return {
      id: this._id,
      userId: this._userId,
      name: this._name,
      agentId: this._agentId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      metadata: this._metadata,
    };
  }
}

// ============================================================================
// Persistence Types
// ============================================================================

export interface ChatRecord {
  id: string;
  userId: string;
  name: string;
  agentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface ChatJSON {
  id: string;
  userId: string;
  name: string;
  agentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface ChatFilter {
  limit: number;
  offset: number;
  search?: string;
}

export const ChatFilterSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  search: z.string().optional(),
});

export type ChatFilterInput = z.infer<typeof ChatFilterSchema>;