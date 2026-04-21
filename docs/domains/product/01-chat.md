# Domain: Chat

## Overview

Chat domain - управление чатами и сообщениями с поддержкой AG-UI протокола.

## Entities

```mermaid
classDiagram
    class Chat {
        UUID id
        UUID user_id
        UUID agent_id
        string name
        ChatStatus status
        datetime created_at
        datetime updated_at
        dict metadata
    }

    class ChatParticipant {
        UUID id
        UUID chat_id
        UUID user_id
        string role
        datetime joined_at
    }

    class Message {
        UUID id
        UUID chat_id
        MessageRole role
        string content
        string model
        list~ToolCall~ tool_calls
        UUID tool_call_id
        string reasoning
        string activity_type
        int tokens_used
        int latency_ms
        datetime created_at
        dict metadata
    }

    class ChatSettings {
        UUID id
        UUID chat_id
        bool streaming_enabled
        string default_model
    }

    Chat "1" --> "*" ChatParticipant
    Chat "1" --> "1" ChatSettings
    Chat "1" --> "*" Message
```

## Message Roles (AG-UI)

```mermaid
graph LR
    subgraph ROLES["Message Roles"]
        U[user]
        AS[assistant]
        SY[system]
        T[tool]
        RE[reasoning]
        AC[activity]
    end
```

## Chat Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat Service
    participant A as Agent Service
    participant L as LLM Engine
    participant DB as Database

    U->>C: POST /chats/{id}/messages
    C->>A: Execute agent
    A->>L: Stream request
    L-->>A: SSE stream (AG-UI events)
    A-->>C: Stream to user
    C->>DB: Save message
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chats | List chats |
| POST | /api/chats | Create chat |
| GET | /api/chats/{id} | Get chat |
| PATCH | /api/chats/{id} | Update chat |
| DELETE | /api/chats/{id} | Delete chat |
| GET | /api/chats/{id}/messages | List messages |
| POST | /api/chats/{id}/messages | Send message (SSE) |

## AG-UI Compatibility

```mermaid
graph LR
    subgraph STREAMING["SSE Events"]
        TMS[TEXT_MESSAGE_START]
        TMC[TEXT_MESSAGE_CONTENT]
        TME[TEXT_MESSAGE_END]
        
        TCS[TOOL_CALL_START]
        TCA[TOOL_CALL_ARGS]
        TCE[TOOL_CALL_END]
        
        RMS[REASONING_MESSAGE_START]
        RMC[REASONING_MESSAGE_CONTENT]
        RME[REASONING_MESSAGE_END]
    end
```

### Event Mapping

| Event | Data | Description |
|-------|------|-------------|
| text_message_start | `{messageId, role}` | Start of assistant message |
| text_message_content | `{messageId, delta}` | Text chunk |
| text_message_end | `{messageId}` | End of message |
| tool_call_start | `{toolCallId, toolName}` | Start tool call |
| tool_call_args | `{toolCallId, delta}` | JSON arguments |
| tool_call_end | `{toolCallId}` | End tool call |
| reasoning_message_start | `{messageId}` | Start reasoning |
| reasoning_message_content | `{messageId, delta}` | Reasoning chunk |