# Domain: HITL (Human-in-the-Loop)

## Overview

Human-in-the-Loop система для approval/rejection действий агентов и tool executions.

## Use Cases

1. **Tool Execution Approval** - Агент хочет выполнить опасный tool (удаление, отправка)
2. **Response Review** - AI сгенерировал ответ, человек должен одобрить
3. **Custom Widgets** - Кастомные формы для ввода данных человеком

## Entities

```mermaid
classDiagram
    class HITLRequest {
        UUID id
        HITLType type
        UUID execution_id
        UUID chat_id
        UUID user_id
        string status  # pending, approved, rejected
        string title
        string description
        dict payload  # What needs approval
        dict response  # Human response
        datetime created_at
        datetime responded_at
    }

    class HITLResponse {
        UUID id
        UUID request_id
        UUID user_id
        string action  # approve, reject
        dict data  # Additional data from human
        datetime created_at
    }

    class HITLTemplate {
        UUID id
        string name
        HITLType type
        string widget_type  # approval, form, choice, custom
        dict schema  # Widget JSON schema
    }

    HITLRequest "1" --> "*" HITLResponse
    HITLTemplate "1" --> "*" HITLRequest
```

## HITL Types

```mermaid
graph TB
    subgraph TYPES["HITL Types"]
        TE[Tool Execution<br/>Approve tool call]
        RE[Response<br/>Approve AI response]
        CW[Custom Widget<br/>Custom form]
        WI[Waiting<br/>Pause for input]
    end
```

## Chat Integration

### Message Payload Format

```json
{
  "content": "Should I delete the file?",
  "hitl": {
    "type": "tool_execution",
    "tool_name": "delete_file",
    "tool_args": { "path": "/data/important.txt" },
    "require_approval": true,
    "options": {
      "approve_label": "Delete",
      "reject_label": "Cancel",
      "show_preview": true
    }
  }
}
```

### With Custom Widget

```json
{
  "content": "Please confirm the order details",
  "hitl": {
    "type": "custom_widget",
    "widget": {
      "type": "form",
      "schema": {
        "type": "object",
        "properties": {
          "quantity": { "type": "integer", "minimum": 1 },
          "shipping_address": { "type": "string" },
          "confirm": { "type": "boolean" }
        },
        "required": ["quantity", "confirm"]
      }
    }
  }
}
```

### Approval/Rejection in Request

```json
{
  "content": "Send message to customer",
  "hitl": {
    "type": "response",
    "require_approval": true
  },
  "approvals": {
    "request_id_1": { "action": "approve" },
    "request_id_2": { "action": "reject", "reason": "Wrong recipient" }
  }
}
```

## Agentic Workflow Integration

### Separate Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents/{id}/executions/{exec_id}/hitl` | GET | List pending HITL requests |
| `/api/agents/{id}/executions/{exec_id}/hitl/{request_id}/respond` | POST | Respond to HITL |
| `/api/agents/{id}/executions/{exec_id}/pause` | POST | Pause execution for human input |
| `/api/agents/{id}/executions/{exec_id}/resume` | POST | Resume after human input |

### Agent Flow with HITL

```mermaid
sequenceDiagram
    participant A as Agent
    participant L as LLM Engine
    participant H as HITL Service
    participant U as User

    A->>L: Generate (wants to call tool)
    L-->>A: Decision: call tool "delete"
    
    alt Tool requires approval
        A->>H: Create HITL request
        H-->>A: Request created
        A->>U: Show approval UI
        A->>A: Pause execution
        
        U->>H: Approve/Reject
        H-->>A: Response received
        
        alt Approved
            A->>A: Execute tool
            A->>L: Continue loop
        else Rejected
            A->>A: Skip tool, continue
        end
    else No approval needed
        A->>A: Execute tool directly
    end
```

## API Reference

### REST Endpoints

#### HITL Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/hitl | List my HITL requests |
| GET | /api/hitl/{id} | Get HITL request |
| POST | /api/hitl/{id}/respond | Respond to request |

#### Agent Executions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agents/{id}/executions/{exec_id}/hitl | Execution HITL requests |
| POST | /api/agents/{id}/executions/{exec_id}/hitl/{request_id}/approve | Approve |
| POST | /api/agents/{id}/executions/{exec_id}/hitl/{request_id}/reject | Reject |
| POST | /api/agents/{id}/executions/{exec_id}/hitl/{request_id}/respond | Custom response |

#### Chat Messages

| Field | Type | Description |
|-------|------|-------------|
| `hitl` | object | HITL config |
| `hitl.type` | string | Type: tool_execution, response, custom_widget |
| `hitl.require_approval` | boolean | Requires human approval |
| `hitl.widget` | object | Custom widget schema |
| `approvals` | map | Map of request_id -> response |

## Widget Types

### Approval Widget

```json
{
  "type": "approval",
  "title": "Confirm Action",
  "description": "Are you sure?",
  "approve_label": "Yes, proceed",
  "reject_label": "No, cancel"
}
```

### Choice Widget

```json
{
  "type": "choice",
  "title": "Select Option",
  "options": [
    { "value": "a", "label": "Option A" },
    { "value": "b", "label": "Option B" }
  ],
  "multi": false
}
```

### Form Widget

```json
{
  "type": "form",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" }
    }
  }
}
```

## Notification Flow

```mermaid
flowchart TB
    H[HITL Created] --> N{Notification Type}
    N --> E[Email]
    N --> P[Push]
    N --> W[WebSocket]
    
    E --> U[User]
    P --> U
    W --> U
```