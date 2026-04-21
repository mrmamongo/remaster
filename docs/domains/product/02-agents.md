# Domain: Agents

## Overview

AI Agents domain с поддержкой ReAct loop pattern.

## Entities

```mermaid
classDiagram
    class Agent {
        UUID id
        string name
        string description
        string system_prompt
        UUID model_id
        int max_iterations
        float temperature
        bool reasoning_enabled
        AgentStatus status
        datetime created_at
        datetime updated_at
        dict metadata
    }

    class AgentTool {
        UUID id
        UUID agent_id
        string name
        string description
        ToolType type
        dict definition
        bool is_enabled
    }

    class AgentExecution {
        UUID id
        UUID agent_id
        UUID chat_id
        UUID user_id
        string status
        int current_iteration
        string state
        datetime started_at
        datetime completed_at
        dict metadata
    }

    Agent "1" --> "*" AgentTool
    Agent "1" --> "*" AgentExecution
```

## ReAct Loop

```mermaid
stateDiagram-v2
    [*] --> Think
    Think --> Plan
    Plan --> Action
    Action --> Observe
    Observe --> Think
    Observe --> Final
    Final --> [*]
    
    note right of Think: Analyze context
    note right of Plan: Select tool/action
    note right of Action: Execute tool
    note right of Observe: Parse result
```

```mermaid
graph TD
    T[Think<br/>Analyze context] --> P[Plan<br/>Select action]
    P --> A[Action<br/>Execute tool or respond]
    A --> O[Observe<br/>Parse result]
    O --> T
    O --> F[Final<br/>Return to user]
```

## Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat
    participant A as Agent
    participant T as Tools
    participant L as LLM Engine
    participant DB as Database

    U->>C: Send message
    C->>A: Start execution
    
    loop ReAct Loop (max iterations)
        A->>L: Generate (think)
        L-->>A: Reasoning
        
        alt Needs tool
            A->>T: Execute tool
            T-->>A: Tool result
            A->>A: Add tool message
        else Final answer
            A->>C: Stream response
        end
    end
    
    A->>DB: Save execution log
```

## Tool Types

```mermaid
graph LR
    subgraph TYPES["Tool Types"]
        MCP[MCP Tools]
        FN[Function Tools]
        HTTP[HTTP Tools]
        KB[Knowledge Search]
    end
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agents | List agents |
| POST | /api/agents | Create agent |
| GET | /api/agents/{id} | Get agent |
| PATCH | /api/agents/{id} | Update agent |
| DELETE | /api/agents/{id} | Delete agent |
| POST | /api/agents/{id}/execute | Execute agent |
| DELETE | /api/agents/{id}/executions/{exec_id} | Stop execution |

## Reasoning Visibility

```mermaid
graph LR
    subgraph VISIBILITY["Reasoning Options"]
        V1[Visible to user]
        V2[Hidden (internal only)]
        V3[Collapsible]
    end
```

## Iteration Tracking

```mermaid
classDiagram
    class ExecutionStep {
        UUID id
        UUID execution_id
        int iteration
        StepType type
        string thought
        string action
        string observation
        int tokens_used
        int latency_ms
        datetime timestamp
    }

    enum StepType {
        THINK
        PLAN
        ACTION
        OBSERVE
    }
```