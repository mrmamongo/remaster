# Domain: MCP Gateway

## Overview

MCP Gateway domain - управление MCP серверами, tool registry и протокол execution с поддержкой tool-level permissions.

## Entities

```mermaid
classDiagram
    class MCPServer {
        UUID id
        UUID? group_id  # Null = platform-wide, Group = group scope
        string name
        string description
        string endpoint
        AuthType auth_type
        dict auth_config
        bool is_enabled
        MCPServerStatus status
        UUID created_by
        datetime created_at
        datetime last_connected
        dict metadata
    }

    class MCPTool {
        UUID id
        UUID server_id
        string name
        string description
        string input_schema
        string output_schema
        bool is_enabled
    }

    class MCPToolPermission {
        UUID id
        UUID tool_id
        string subject_type  # user, group, role
        string subject_id
        MCPToolAction action
    }

    class MCPServerPermission {
        UUID id
        UUID server_id
        string subject_type
        string subject_id
        MCPServerAction action
    }

    MCPServer "1" --> "*" MCPTool
    MCPServer "1" --> "*" MCPServerPermission
    MCPTool "1" --> "*" MCPToolPermission
```

## MCP Protocol

```mermaid
flowchart LR
    subgraph HANDSHAKE["Handshake"]
        C[Connect] --> I[Initialize]
        I --> R[Tools List]
    end

    subgraph TOOL_CALL["Tool Call"]
        T[Call Tool] --> P[Progress]
        P --> E[Complete]
    end

    subgraph DISCONNECT["Disconnect"]
        D[Close] --> E
    end
```

## Permission Model

### Roles & Scope

```mermaid
graph TB
    subgraph ROLES["Roles"]
        PA[Platform Admin<br/>All MCP servers]
        GA[Group Admin<br/>Group MCPs]
        U[User<br/>Use tools only]
    end

    subgraph SCOPE["Resource Scope"]
        P[Platform-wide<br/>group_id = NULL]
        G[Group<br/>group_id = UUID]
    end

    PA --> P
    PA --> G
    GA --> G
    U --> P
    U --> G
```

### Permission Matrix

| Role | Scope | Create | Read | Update | Delete | Execute Tools |
|------|-------|--------|------|--------|--------|---------------|
| Platform Admin | Platform-wide | ✓ | ✓ | ✓ | ✓ | ✓ |
| Platform Admin | Group | ✓ | ✓ | ✓ | ✓ | ✓ |
| Group Admin | Own Group | ✗ | ✓ | ✓ | ✗ | ✓ |
| User | Any | ✗ | Own | ✗ | ✗ | ✓* |

*With tool-level permission

### Tool-Level Permissions

Granular permissions per tool within a server:

```
# Examples
mcp:server:123@tool:get_weather@execute@user:alex
mcp:server:123@tool:search@execute@group:engineering
mcp:server:123@tool:*@admin@role:mcp_admin
```

| Action | Description |
|--------|-------------|
| `execute` | Execute the tool |
| `view` | See tool exists (list/read) |
| `admin` | Enable/disable tool, update config |

```mermaid
graph TB
    subgraph PERMISSIONS["Permission Types"]
        EXE[Execute]
        V[View]
        A[Admin]
    end
    
    subgraph SUBJECTS["Subjects"]
        U[User]
        G[Group]
        R[Role]
    end
    
    EXE --> U
    EXE --> G
    V --> U
    V --> G
    A --> R
```

**Permission Matrix:**

| Action | Description |
|--------|-------------|
| `execute` | Execute the tool |
| `view` | See tool exists (list/read) |
| `admin` | Enable/disable tool, update config |

**Examples:**
```
mcp:server:123@tool:get_weather@execute@user:alex
mcp:server:123@tool:search@execute@group:engineering
mcp:server:123@tool:*@admin@role:mcp_admin
```

## Permission Check Flow

```mermaid
sequenceDiagram
    participant A as Agent
    participant MG as MCP Gateway
    participant K as Ory Keto
    participant C as Cache
    participant MS as MCP Server

    A->>MG: Call tool "get_weather"
    MG->>K: Check mcp:server:X@tool:get_weather@execute@user:A
    K->>C: Cache check
    
    alt Has permission
        C-->>K: ALLOW
        K-->>MG: ALLOW
        MG->>MS: Execute tool
        MS-->>MG: Result
        MG-->>A: Tool result
    else No permission
        C-->>K: DENY
        K-->>MG: DENY
        MG-->>A: 403 Forbidden
    end
```

## Auth Types

```mermaid
graph LR
    subgraph AUTH["Auth Types"]
        N[None]
        K[API Key]
        O[OAuth2]
        B[Bearer]
    end
```

## Connection Lifecycle

```mermaid
sequenceDiagram
    participant A as Agent
    participant MG as MCP Gateway
    participant MS as MCP Server
    participant DB as Database

    A->>MG: Connect to server
    MG->>MS: JSON-RPC initialize
    MS-->>MG: Result {tools}
    MG->>DB: Store tools with permissions
    MG->>A: Connection established
    
    loop Tool Execution
        A->>MG: tools/call
        MG->>MG: Check tool permissions
        MG->>MS: RPC call
        MS-->>MG: Result
        MG->>A: Response
    end
    
    A->>MG: Disconnect
    MG->>MS: Close connection
    MG->>DB: Mark disconnected
```

## API Reference

### REST Endpoints

#### Servers (Admin/Group Admin)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/mcp | List MCP servers | Platform/Group Admin |
| POST | /api/mcp | Register server | Platform Admin |
| GET | /api/mcp/{id} | Get server | Platform/Group Admin |
| PATCH | /api/mcp/{id} | Update server | Platform/Group Admin |
| DELETE | /api/mcp/{id} | Delete server | Platform Admin |
| POST | /api/mcp/{id}/test | Test connection | Platform/Group Admin |
| POST | /api/mcp/{id}/connect | Connect | Platform/Group Admin |
| POST | /api/mcp/{id}/disconnect | Disconnect | Platform/Group Admin |

#### Tools (Admin/Group Admin)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/mcp/{id}/tools | List tools | Platform/Group Admin |
| GET | /api/mcp/{id}/tools/{tool_id} | Get tool | Platform/Group Admin |
| PATCH | /api/mcp/{id}/tools/{tool_id} | Enable/disable | Platform/Group Admin |

#### Tool Permissions (Admin)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/mcp/{id}/tools/{tool_id}/permissions | List permissions | Platform/Group Admin |
| POST | /api/mcp/{id}/tools/{tool_id}/permissions | Add permission | Platform Admin |
| DELETE | /api/mcp/{id}/tools/{tool_id}/permissions/{perm_id} | Remove permission | Platform Admin |

#### Tool Execution (All authenticated)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/mcp/{id}/tools/{tool_name}/execute | Execute tool | User + tool permission |

## Server Status

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    Disconnected --> Connecting
    Connecting --> Connected
    Connecting --> Error
    Connected --> Disconnected
    Connected --> Error
    Error --> Disconnected
    
    note right of Error: Retry possible
```