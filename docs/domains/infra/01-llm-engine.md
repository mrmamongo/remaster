# Domain: LLM Engine & Model Gateway

## Overview

LLM платформа - управление моделями, модельным шлюзом и LLM движком с поддержкой OpenAI и Anthropic совместимых API.

## Entities

```mermaid
classDiagram
    class Model {
        UUID id
        string name
        ModelProvider provider
        ModelType model_type
        string endpoint_url
        string api_key_ref
        bool is_enabled
        int max_tokens
        bool supports_streaming
        bool supports_function_calling
        dict pricing
        datetime created_at
        dict metadata
    }

    class ModelHealth {
        UUID model_id
        HealthStatus status
        float latency_p50
        float latency_p99
        int error_rate
        int requests_per_minute
        float throughput_tpm
        datetime last_check
    }

    class ModelGateway {
        UUID id
        string name
        string type  # sglang | vllm
        string endpoint
        list servers
        int gpu_count
        GatewayStatus status
    }

    Model "1" --> "1" ModelHealth
    ModelGateway "1" --> "*" Model
```

## Model Dashboard

```mermaid
graph TB
    subgraph DASHBOARD["Model Dashboard"]
        G1[Total Requests]
        G2[Avg Latency]
        G3[Throughput TPM]
        G4[Error Rate]
        
        G5[Requests by Model<br/>Bar Chart]
        G6[Latency over Time<br/>Line Chart]
        G7[GPU Utilization<br/>Gauge]
        G8[Cost by Day<br/>Area Chart]
    end
```

**Dashboard Metrics:**

| Metric | Description | Visual |
|--------|-------------|--------|
| Total Requests | All time request count | Number |
| Requests/min | Current RPS | Number + Trend |
| Avg Latency P50 | Median response time | Line chart |
| Avg Latency P99 | P99 response time | Line chart |
| Throughput TPM | Tokens per minute | Gauge |
| Error Rate | % failed requests | Line chart |
| Cost | Total cost (cloud models) | Area chart |
| GPU Util | Local GPU utilization | Gauge per GPU |

## Providers

```mermaid
graph LR
    subgraph CLOUD["Cloud Providers"]
        OA[OpenAI]
        AN[Anthropic]
        GR[Groq]
    end

    subgraph LOCAL["Local Providers"]
        SG[SGLang]
        VL[vLLM]
    end
```

## Model Types

```mermaid
graph LR
    subgraph TYPES["Model Types"]
        CH[Chat]
        EM[Embedding]
        RE[Re-rank]
        VI[Vision]
    end
```

## OpenAI-Compatible API

### Chat Completions

```mermaid
graph LR
    subgraph ENDPOINTS["Endpoints"]
        CC[/v1/chat/completions]
        RE[/v1/responses]
        EM[/v1/embeddings]
        MO[/v1/models]
    end
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| POST | /v1/chat/completions | Chat completions (OpenAI compatible) |
| POST | /v1/responses | Responses API (OpenAI) |
| POST | /v1/embeddings | Embeddings |
| GET | /v1/models | List available models |
| GET | /v1/models/{model} | Get model info |

### Request Format (OpenAI Compatible)

```json
POST /v1/chat/completions
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are helpful" },
    { "role": "user", "content": "Hello" }
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": true
}
```

### Response Format

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## Anthropic-Compatible API

| Endpoint | Method | Description |
|----------|--------|-------------|
| POST | /v1/messages | Anthropic messages API |
| POST | /v1/messages/cancel | Cancel message |

### Request Format (Anthropic Compatible)

```json
POST /v1/messages
{
  "model": "claude-sonnet-4-20250514",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "max_tokens": 1024,
  "stream": true
}
```

### Response Format

```json
{
  "id": "msg_xxx",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Hello!" }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 20
  }
}
```

## Gateway Architecture

```mermaid
flowchart TB
    subgraph CLIENTS["Clients"]
        A[Agent]
        C[Chat]
        K[Knowledge]
    end

    subgraph ROUTER["Model Router"]
        R[Select model<br/>by capability]
    end

    subgraph GATEWAY["Model Gateway"]
        SG[SGLang Cluster<br/>4x GPU]
        VL[vLLM Cluster<br/>4x GPU]
    end

    subgraph EXTERNAL["External APIs"]
        O[OpenAI]
        AN[Anthropic]
        GR[Groq]
    end

    A --> R
    C --> R
    K --> R
    
    R -->|Local models| SG
    R -->|Local models| VL
    R -->|Cloud models| O
    R -->|Cloud models| AN
    R -->|Cloud models| GR
```

## Model Routing Logic

```mermaid
flowchart TB
    R[Request] --> M{Model specified?}
    
    M -->|Yes| V{Valid model?}
    M -->|No| C{Has capability?}
    
    V -->|Yes| P[Use specified]
    V -->|No| E[Error 400]
    
    C -->|Vision| V1[vLLM Vision]
    C -->|Embedding| E1[Embedding Model]
    C -->|Chat| L1[Local Chat]
    C -->|Default| O1[Default Model]
```

## Inference Pipeline

```mermaid
sequenceDiagram
    participant C as Client
    participant E as LLM Engine
    participant R as Router
    participant G as Model Gateway
    participant M as Model
    participant T as Tracer
    participant D as Dashboard

    C->>E: Generate request
    E->>R: Route to model
    R-->>E: Selected model
    
    alt Local model
        E->>G: Forward request
        G->>M: Process
        M-->>G: Stream response
        G-->>E: Stream to client
    else Cloud API
        E->>M: API call
        M-->>E: Response
    end
    
    E->>T: Record trace
    E->>D: Update metrics
    E->>C: SSE stream
```

## Health Monitoring

```mermaid
sequenceDiagram
    participant M as Monitor
    participant G as Gateway
    participant S as SGLang/vLLM
    participant DB as Metrics

    M->>G: Health check
    G->>S: Ping
    alt Healthy
        S-->>G: OK
        G->>DB: Record healthy
    else Unhealthy
        S-->>G: Error
        G->>DB: Record error
    end
    G-->>M: Status
```

## API Reference

### Public API (OpenAI Compatible)

| Endpoint | Method | Description |
|----------|--------|-------------|
| POST | /v1/chat/completions | Chat completions |
| POST | /v1/responses | Responses API |
| POST | /v1/embeddings | Embeddings |
| GET | /v1/models | List available models |
| GET | /v1/models/{model} | Get model info |

### Public API (Anthropic Compatible)

| Endpoint | Method | Description |
|----------|--------|-------------|
| POST | /v1/messages | Anthropic messages API |
| POST | /v1/messages/cancel | Cancel message |

### Dashboard (Read-only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/models | Models overview |
| GET | /api/dashboard/models/{id}/history | Historical metrics |
| GET | /api/dashboard/gpu | GPU utilization |
| GET | /api/dashboard/costs | Cost tracking |

> **Note:** Model registration/management is internal — available via Admin Panel.

## Infrastructure

```mermaid
graph TB
    subgraph SERVER1["Server 1: 2x AMD EPYC + 4x RTX 6000"]
        G1A[GPU 0]
        G1B[GPU 1]
        G1C[GPU 2]
        G1D[GPU 3]
    end

    subgraph SERVER2["Server 2: 2x AMD EPYC + 4x RTX 6000"]
        G2A[GPU 0]
        G2B[GPU 1]
        G2C[GPU 2]
        G2D[GPU 3]
    end

    subgraph SERVER3["Server 3: 2x AMD EPYC + 4x RTX 6000"]
        G3A[GPU 0]
        G3B[GPU 1]
        G3C[GPU 2]
        G3D[GPU 3]
    end
```

**Total Resources:**
- 12x NVIDIA RTX 6000
- 6x AMD EPYC
- ~150GB VRAM