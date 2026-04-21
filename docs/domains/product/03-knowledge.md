# Domain: Knowledge

## Overview

Knowledge Base domain - управление базами знаний, документами и RAG pipeline.

## Entities

```mermaid
classDiagram
    class KnowledgeBase {
        UUID id
        UUID owner_id
        UUID? group_id  # Null = platform-wide, Group = department scope
        string name
        string description
        UUID embedding_model_id
        SearchType search_type
        int chunk_size
        int chunk_overlap
        ChunkingStrategy chunking_strategy
        KBStatus status
        datetime created_at
        datetime updated_at
        dict metadata
    }

    class KnowledgeBasePermission {
        UUID id
        UUID knowledge_base_id
        string subject_type  # user, group
        string subject_id
        KBAction action
    }

    class Document {
        UUID id
        UUID knowledge_base_id
        string filename
        string original_filename
        string file_path
        int file_size
        string mime_type
        DocumentStatus status
        int chunks_count
        int parent_chunks_count
        datetime embedded_at
        datetime created_at
        dict metadata
    }

    class Chunk {
        UUID id
        UUID document_id
        UUID knowledge_base_id
        UUID? parent_chunk_id
        string content
        list~float~ embedding
        int position
        dict metadata
    }

    KnowledgeBase "1" --> "*" Document
    KnowledgeBase "1" --> "*" KnowledgeBasePermission
    Document "1" --> "*" Chunk
    Chunk "1" --* "0..1" Chunk : parent
```

## Processing Pipeline

```mermaid
flowchart LR
    subgraph IN["Ingest"]
        U[Upload] --> V[Validate]
        V --> CS[Chunk Strategy]
        CS --> E[Embed]
        E --> S[Store]
        S --> I[Index]
    end

    subgraph OUT["Search"]
        Q[Query] --> EMB[Embed]
        EMB --> VS[Vector Search]
        VS --> MR[Merge Parent]
        MR --> R[Re-rank]
        R --> CTX[Build Context]
    end
```

## Chunking Strategies

```mermaid
graph TB
    subgraph STRATEGIES["Chunking Strategies"]
        SEM[Semantic<br/>By semantic boundaries]
        BAS[Basic<br/>Recursive text split]
        XLS[CSV/Excel<br/>Row-based]
        PH[Parent-Child<br/>Hierarchical]
    end
```

### Basic (Recursive)

```python
# Recursive text splitting
# Split by paragraphs -> sentences -> tokens
# Max chunk_size tokens, overlap chunk_overlap tokens
```

### Semantic

```python
# Uses embedding scores to find semantic boundaries
# 1. Split by paragraphs
# 2. Calculate embeddings for each paragraph
# 3. Merge similar paragraphs into chunks
# 4. Ensure chunk_size limit
```

### CSV/Excel

```python
# Row-based with column selection
config:
  columns: ["description", "name"]  # Embed only these
  include_columns: ["id", "sku"]     # Include in context, don't embed
  delimiter: ","
  header: true

# Each row becomes a chunk:
# "id: 001, sku: ABC, description: Product description..."
```

### Parent-Child Chunking

```mermaid
flowchart TB
    DOC[Document] --> P1[Parent Chunk 1]
    DOC --> P2[Parent Chunk 2]
    DOC --> P3[Parent Chunk 3]
    
    P1 --> C1A[Child A]
    P1 --> C1B[Child B]
    P2 --> C2A[Child A]
    P3 --> C3A[Child A]
    P3 --> C3B[Child B]
    
    C1A -.->|links to| P1
    C1B -.->|links to| P1
    C2A -.->|links to| P2
    C3A -.->|links to| P3
    C3B -.->|links to| P3
```

**Workflow:**
1. Split document into parent chunks (large, e.g., 4000 tokens)
2. Split parent into child chunks (small, e.g., 200 tokens)
3. **Embed only children** in vector DB
4. On search: retrieve children → link to parents → include parents in context

## API Reference

### REST Endpoints

#### Knowledge Bases (Admin/Group Admin)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/kb | List KBs | Platform/Group Admin, Owner |
| POST | /api/kb | Create KB | Platform/Group Admin, Owner |
| GET | /api/kb/{id} | Get KB | With permission |
| PATCH | /api/kb/{id} | Update KB | Owner, Platform/Group Admin |
| DELETE | /api/kb/{id} | Delete KB | Owner, Platform Admin |

#### KB Permissions (Admin)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/kb/{id}/permissions | List permissions | Owner, Platform Admin |
| POST | /api/kb/{id}/permissions | Add permission | Owner, Platform Admin |
| DELETE | /api/kb/{id}/permissions/{perm_id} | Remove permission | Owner, Platform Admin |

#### Documents

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/kb/{id}/documents | List documents | With read |
| POST | /api/kb/{id}/documents | Upload document | With write |
| GET | /api/kb/{id}/documents/{doc_id} | Get document | With read |
| DELETE | /api/kb/{id}/documents/{doc_id} | Delete document | With write |
| GET | /api/kb/{id}/documents/{doc_id}/preview | Preview | With read |
| GET | /api/kb/{id}/documents/{doc_id}/chunks | Doc chunks | With read |

#### Chunks

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/kb/{id}/chunks | List all chunks | With read |
| GET | /api/kb/{id}/chunks/{chunk_id} | Get chunk | With read |
| GET | /api/kb/{id}/chunks/{chunk_id}/parent | Get parent | With read |

#### Search (All authenticated)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/kb/{id}/search | Search KB | With read |
| POST | /api/kb/{id}/search/stream | Search + stream | With read |

## Configuration Example

```json
{
  "name": "Product Knowledge Base",
  "description": "Product documentation and specs",
  "embedding_model_id": "uuid",
  "search_type": "hybrid",
  "chunk_size": 512,
  "chunk_overlap": 50,
  "chunking_strategy": "parent_child",
  "chunking_config": {
    "strategy": "semantic",
    "parent_chunk_size": 2000,
    "child_chunk_size": 200,
    "csv": {
      "columns": ["description", "name"],
      "include_columns": ["id", "sku"]
    }
  }
}
```

## Permission Model

### Roles & Scope

```mermaid
graph TB
    subgraph ROLES["Roles"]
        PA[Platform Admin<br/>All KBs]
        GA[Group Admin<br/>Group KBs]
        O[Owner<br/>Own KBs]
        U[User<br/>Read access]
    end

    subgraph SCOPE["Resource Scope"]
        P[Platform-wide<br/>group_id = NULL]
        G[Group<br/>group_id = UUID]
    end

    PA --> P
    PA --> G
    GA --> G
    O --> P
    O --> G
    U --> P
    U --> G
```

### Permission Matrix

| Role | Scope | Create | Read | Update | Delete | Search |
|------|-------|--------|------|--------|--------|--------|
| Platform Admin | Platform-wide | ✓ | ✓ | ✓ | ✓ | ✓ |
| Platform Admin | Group | ✓ | ✓ | ✓ | ✓ | ✓ |
| Group Admin | Own Group | ✓ | ✓ | ✓ | ✓ | ✓ |
| Owner | Own KB | ✓ | ✓ | ✓ | ✓ | ✓ |
| User | Any | ✗ | With permission | ✗ | ✗ | ✓* |

*With read permission

## Processing States

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Processing
    Processing --> Ready
    Processing --> Error
    Error --> Processing
    Ready --> [*]
    
    note right of Pending: Awaiting processing
    note right of Processing: Chunking & embedding
    note right of Ready: Queryable
    note right of Error: Needs retry
```

## RAG Pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant KB as Knowledge Service
    participant E as Embedding Model
    participant V as Vector DB
    participant R as Re-ranker
    participant L as LLM Engine

    U->>KB: Search query
    KB->>E: Embed query
    E-->>KB: Query embedding
    KB->>V: Vector search (top k)
    V-->>KB: Retrieved child chunks
    KB->>KB: Resolve parent chunks
    KB->>R: Re-rank with parents
    R-->>KB: Re-ranked chunks + parents
    KB->>KB: Build context
    KB->>L: Generate with context
    L-->>U: Streaming response
```