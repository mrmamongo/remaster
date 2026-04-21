# AG-UI Protocol Specification

> Agent User Interaction Protocol - Vendor-neutral message format for AI chat applications

## Message Types

### Base Structure

```typescript
interface BaseMessage {
  id: string;           // Unique identifier (UUID)
  role: MessageRole;     // Message role
  content?: string;      // Text content
  name?: string;        // Sender name
}
```

### Message Roles

| Role | Description | Content Type |
|------|-------------|--------------|
| `user` | User input | `string \| InputContent[]` |
| `assistant` | AI response | `string` (optional if tool calls) |
| `system` | System instructions | `string` |
| `tool` | Tool execution result | `string` |
| `reasoning` | AI reasoning (thinking) | `string` |
| `activity` | Activity updates | `Record<string, any>` |

### User Message (Multimodal)

```typescript
interface UserMessage extends BaseMessage {
  role: "user";
  content: string | InputContent[];
}

type InputContent =
  | TextInputContent
  | ImageInputContent
  | AudioInputContent
  | VideoInputContent
  | DocumentInputContent;

interface TextInputContent {
  type: "text";
  text: string;
}

interface ImageInputContent {
  type: "image";
  source: InputContentSource;
  metadata?: Record<string, unknown>;
}

interface InputContentSource {
  type: "data" | "url";
  value: string;        // base64 or URL
  mimeType: string;
}
```

### Assistant Message (with Tool Calls)

```typescript
interface AssistantMessage extends BaseMessage {
  role: "assistant";
  content?: string;              // Text response
  toolCalls?: ToolCall[];        // Active tool calls
  toolCallsDone?: boolean;       // All tool calls completed
}

interface ToolCall {
  id: string;                    // Unique call ID
  name: string;                  // Tool name
  arguments: string | object;   // Arguments (JSON string or object)
}
```

### Tool Message

```typescript
interface ToolMessage extends BaseMessage {
  role: "tool";
  content: string;              // Tool result
  toolCallId: string;           // References parent tool call
  error?: string;                // Error if execution failed
}
```

### Reasoning Message

```typescript
interface ReasoningMessage extends BaseMessage {
  role: "reasoning";
  content: string;              // Reasoning text (visible to user)
}
```

### Activity Message

```typescript
interface ActivityMessage extends BaseMessage {
  role: "activity";
  activityType: string;         // e.g., "PLAN", "SEARCH", "SCRAPE"
  content: Record<string, any>;  // Structured payload for UI
}
```

---

## Streaming Events (SSE)

### Text Message Streaming

```
event: text_message_start
data: { "messageId": "msg_123", "role": "assistant" }

event: text_message_content
data: { "messageId": "msg_123", "delta": "Hello" }

event: text_message_content
data: { "messageId": "msg_123", "delta": " world" }

event: text_message_end
data: { "messageId": "msg_123" }
```

### Tool Call Streaming

```
event: tool_call_start
data: { "toolCallId": "call_abc", "toolName": "search", "parentMessageId": "msg_123" }

event: tool_call_args
data: { "toolCallId": "call_abc", "delta": "{\"query" }

event: tool_call_args
data: { "toolCallId": "call_abc", "delta": "\":\"LLM\"}" }

event: tool_call_end
data: { "toolCallId": "call_abc" }
```

### Reasoning Streaming

```
event: reasoning_message_start
data: { "messageId": "reasoning_1" }

event: reasoning_message_content
data: { "messageId": "reasoning_1", "delta": "Let me analyze..." }

event: reasoning_message_content
data: { "messageId": "reasoning_1", "delta": " the problem." }

event: reasoning_message_end
data: { "messageId": "reasoning_1" }
```

---

## Event Types Reference

```typescript
enum EventType {
  // Text
  TEXT_MESSAGE_START = "text_message_start",
  TEXT_MESSAGE_CONTENT = "text_message_content",
  TEXT_MESSAGE_END = "text_message_end",

  // Tool Calls
  TOOL_CALL_START = "tool_call_start",
  TOOL_CALL_ARGS = "tool_call_args",
  TOOL_CALL_END = "tool_call_end",

  // Reasoning
  REASONING_MESSAGE_START = "reasoning_message_start",
  REASONING_MESSAGE_CONTENT = "reasoning_message_content",
  REASONING_MESSAGE_END = "reasoning_message_end",
}
```

---

## Database Storage

Messages stored in PostgreSQL:

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id),
  role VARCHAR(20) NOT NULL,
  content TEXT,
  model VARCHAR(100),
  tool_calls JSONB,
  tool_call_id UUID,
  reasoning TEXT,
  activity_type VARCHAR(50),
  tokens_used INTEGER,
  latency_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

Storage format:
- Full message object with all fields
- Compatible with AG-UI serialization
- History can be restored 1:1

---

## Client Implementation Notes

1. **Streaming**: Use `EventSource` or `fetch` with `ReadableStream` for SSE
2. **Delta accumulation**: Append `delta` to existing content (text or JSON for tool args)
3. **Tool execution**: When `tool_call_end` received → execute tool → send `ToolMessage`
4. **Reasoning**: Can be shown to user in collapsible section
5. **Activity**: Render based on `activityType` - UI decides visualization

---

*Source: [AG-UI Documentation](https://docs.ag-ui.com/concepts/messages)*
*Version: 1.0*
