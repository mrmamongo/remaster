# Knowledge Domain — RAG Implementation

## Domain Layer

```python
# domain/knowledge/entities.py
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from typing import Optional


class SearchMethod(str, Enum):
    VECTOR = "vector"
    BM25 = "bm25"
    HYBRID = "hybrid"


class DocumentStatus(str, Enum):
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


@dataclass
class KnowledgeBase:
    id: UUID
    name: str
    owner_id: UUID
    search_methods: list[SearchMethod] = field(default_factory=list)
    embedding_model_id: UUID
    reranker_model_id: Optional[UUID] = None
    top_k: int = 5
    chunk_size: int = 1000
    chunk_overlap: int = 200
    metadata: dict = field(default_factory=dict)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def create(
        cls,
        name: str,
        owner_id: UUID,
        embedding_model_id: UUID,
        search_methods: list[SearchMethod] = None,
        top_k: int = 5,
        chunk_size: int = 1000,
    ) -> "KnowledgeBase":
        now = datetime.utcnow()
        if search_methods is None:
            search_methods = [SearchMethod.VECTOR]
        
        return cls(
            id=uuid4(),
            name=name,
            owner_id=owner_id,
            search_methods=search_methods,
            embedding_model_id=embedding_model_id,
            top_k=top_k,
            chunk_size=chunk_size,
            created_at=now,
            updated_at=now,
        )
    
    def add_search_method(self, method: SearchMethod) -> None:
        if method not in self.search_methods:
            self.search_methods.append(method)
            self.updated_at = datetime.utcnow()
    
    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = datetime.utcnow()


@dataclass
class Document:
    id: UUID
    knowledge_base_id: UUID
    filename: str
    file_type: str
    file_size: int
    s3_key: str
    status: DocumentStatus
    chunk_count: int = 0
    metadata: dict = field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def create(
        cls,
        knowledge_base_id: UUID,
        filename: str,
        file_type: str,
        file_size: int,
        s3_key: str,
    ) -> "Document":
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            knowledge_base_id=knowledge_base_id,
            filename=filename,
            file_type=file_type,
            file_size=file_size,
            s3_key=s3_key,
            status=DocumentStatus.PROCESSING,
            created_at=now,
            updated_at=now,
        )
    
    def mark_processed(self, chunk_count: int) -> None:
        self.status = DocumentStatus.PROCESSED
        self.chunk_count = chunk_count
        self.updated_at = datetime.utcnow()
    
    def mark_failed(self, error: str) -> None:
        self.status = DocumentStatus.FAILED
        self.metadata["error"] = error
        self.updated_at = datetime.utcnow()


@dataclass
class Chunk:
    id: UUID
    document_id: UUID
    knowledge_base_id: UUID
    content: str
    # Embedding stored in Qdrant, not in Postgres
    parent_id: Optional[UUID] = None
    metadata: dict = field(default_factory=dict)
    created_at: datetime
    
    @classmethod
    def create(
        cls,
        document_id: UUID,
        knowledge_base_id: UUID,
        content: str,
        metadata: dict = None,
    ) -> "Chunk":
        return cls(
            id=uuid4(),
            document_id=document_id,
            knowledge_base_id=knowledge_base_id,
            content=content,
            metadata=metadata or {},
            created_at=datetime.utcnow(),
        )


@dataclass
class SearchResult:
    chunk_id: UUID
    document_id: UUID
    content: str
    score: float
    metadata: dict


@dataclass
class KnowledgeBaseSearchResult:
    results: list[SearchResult]
    query: str
    total: int
    search_method: SearchMethod
    took_ms: int
```

## Application Layer

```python
# application/knowledge/services.py
from dataclasses import dataclass
from uuid import UUID
from typing import Optional
from dishka import Provider, Scope, provide

from domain.knowledge.entities import (
    KnowledgeBase, Document, Chunk, SearchResult,
    KnowledgeBaseSearchResult, SearchMethod,
)
from domain.knowledge.interfaces import (
    KnowledgeBaseRepository,
    DocumentRepository,
    VectorStore,
    EmbeddingService,
)


@dataclass
class CreateKnowledgeBaseCommand:
    name: str
    owner_id: UUID
    embedding_model_id: UUID
    search_methods: list[SearchMethod] = None
    top_k: int = 5


@dataclass
class UploadDocumentCommand:
    knowledge_base_id: UUID
    filename: str
    file_type: str
    file_size: int
    s3_key: str


@dataclass
class SearchKnowledgeBaseQuery:
    knowledge_base_id: UUID
    query: str
    top_k: Optional[int] = None


class KnowledgeBaseService:
    def __init__(
        self,
        kb_repo: KnowledgeBaseRepository,
        doc_repo: DocumentRepository,
        vector_store: VectorStore,
        embedding_service: EmbeddingService,
    ):
        self._kb_repo = kb_repo
        self._doc_repo = doc_repo
        self._vector_store = vector_store
        self._embedding_service = embedding_service
    
    def create_knowledge_base(self, cmd: CreateKnowledgeBaseCommand) -> KnowledgeBase:
        kb = KnowledgeBase.create(
            name=cmd.name,
            owner_id=cmd.owner_id,
            embedding_model_id=cmd.embedding_model_id,
            search_methods=cmd.search_methods,
            top_k=cmd.top_k,
        )
        self._kb_repo.save(kb)
        return kb
    
    def upload_document(self, cmd: UploadDocumentCommand) -> Document:
        kb = self._kb_repo.get_by_id(cmd.knowledge_base_id)
        if kb is None:
            raise ValueError(f"Knowledge base not found: {cmd.knowledge_base_id}")
        
        if not kb.is_active:
            raise ValueError("Knowledge base is not active")
        
        doc = Document.create(
            knowledge_base_id=cmd.knowledge_base_id,
            filename=cmd.filename,
            file_type=cmd.file_type,
            file_size=cmd.file_size,
            s3_key=cmd.s3_key,
        )
        self._doc_repo.save(doc)
        
        # TODO: Trigger async processing via Prefect or background task
        # For now, inline processing (should be async in production)
        # self._process_document(doc, kb)
        
        return doc
    
    def search(
        self,
        query: SearchKnowledgeBaseQuery,
    ) -> KnowledgeBaseSearchResult:
        kb = self._kb_repo.get_by_id(query.knowledge_base_id)
        if kb is None:
            raise ValueError(f"Knowledge base not found: {query.knowledge_base_id}")
        
        top_k = query.top_k or kb.top_k
        
        # Get embeddings for query
        query_embedding = self._embedding_service.embed(cmd.query)
        
        # Search in vector store
        vector_results = self._vector_store.search(
            collection_id=str(kb.id),
            query_vector=query_embedding,
            limit=top_k * 2,  # Get more for reranking
        )
        
        results = []
        for r in vector_results:
            results.append(SearchResult(
                chunk_id=r.chunk_id,
                document_id=r.document_id,
                content=r.content,
                score=r.score,
                metadata=r.metadata,
            ))
        
        # Rerank if configured
        if kb.reranker_model_id and len(results) > top_k:
            results = await self._rerank(kb, query.query, results)
            results = results[:top_k]
        
        return KnowledgeBaseSearchResult(
            results=results,
            query=query.query,
            total=len(results),
            search_method=kb.search_methods[0],  # Primary method
            took_ms=0,  # Would track timing
        )
    
    async def _rerank(
        self,
        kb: KnowledgeBase,
        query: str,
        results: list[SearchResult],
    ) -> list[SearchResult]:
        # Rerank using reranker model
        # Placeholder for implementation
        return results
```

## Infrastructure Layer — Qdrant

```python
# infrastructure/knowledge/vector_store.py
from typing import Optional
import qdrant_client
from qdrant_client.http.models import Distance, VectorParams, Filter

from domain.knowledge.entities import SearchResult


class QdrantVectorStore:
    def __init__(self, client: qdrant_client.QdrantClient):
        self._client = client
    
    def create_collection(self, collection_id: str, vector_size: int) -> None:
        self._client.create_collection(
            collection_name=collection_id,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
            ),
        )
    
    def upsert(
        self,
        collection_id: str,
        chunks: list[dict],
        vectors: list[list[float]],
    ) -> None:
        self._client.upsert(
            collection_name=collection_id,
            points=[
                {
                    "id": chunk["id"],
                    "vector": vector,
                    "payload": {
                        "content": chunk["content"],
                        "document_id": chunk["document_id"],
                        "knowledge_base_id": chunk["knowledge_base_id"],
                        **chunk.get("metadata", {}),
                    },
                }
                for chunk, vector in zip(chunks, vectors)
            ],
        )
    
    def search(
        self,
        collection_id: str,
        query_vector: list[float],
        limit: int,
        filter: dict = None,
    ) -> list[SearchResult]:
        results = self._client.search(
            collection_name=collection_id,
            query_vector=query_vector,
            limit=limit,
            query_filter=Filter(**filter) if filter else None,
        )
        
        return [
            SearchResult(
                chunk_id=r.id,
                document_id=r.payload["document_id"],
                content=r.payload["content"],
                score=r.score,
                metadata=r.payload,
            )
            for r in results
        ]
    
    def delete_collection(self, collection_id: str) -> None:
        self._client.delete_collection(collection_name=collection_id)
    
    def delete_points(self, collection_id: str, chunk_ids: list[str]) -> None:
        self._client.delete(
            collection_name=collection_id,
            points_selector=models.PointIdsList(points=chunk_ids),
        )
```

## Chunking Strategies

```python
# infrastructure/knowledge/chunking.py
from dataclasses import dataclass
from typing import Iterator


class TextChunker:
    """Simple text chunker."""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def chunk(self, text: str) -> Iterator[dict]:
        """Yield chunks from text."""
        start = 0
        text_len = len(text)
        
        while start < text_len:
            end = min(start + self.chunk_size, text_len)
            chunk_text = text[start:end]
            
            yield {
                "content": chunk_text,
                "metadata": {
                    "start": start,
                    "end": end,
                    "total": text_len,
                },
            }
            
            start += self.chunk_size - self.chunk_overlap


class PDFChunker:
    """PDF chunker with page awareness."""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_chunker = TextChunker(chunk_size, chunk_overlap)
    
    def chunk(self, pages: list[dict]) -> Iterator[dict]:
        """Yield chunks from PDF pages."""
        for page_num, page_text in enumerate(pages):
            for chunk in self.text_chunker.chunk(page_text):
                chunk["metadata"]["page"] = page_num + 1
                yield chunk


class CSVAwareChunker:
    """CSV chunker with column awareness."""
    
    def __init__(self, include_columns: list[str] = None):
        self.include_columns = include_columns
    
    def chunk(self, rows: list[dict]) -> Iterator[dict]:
        """Yield chunks from CSV rows."""
        # Group rows into chunks
        chunk_rows = []
        
        for row in rows:
            if self.include_columns:
                row = {k: v for k, v in row.items() if k in self.include_columns}
            chunk_rows.append(row)
            
            # Emit chunk every N rows or at end
            if len(chunk_rows) >= 100:
                yield {
                    "content": str(chunk_rows),
                    "metadata": {
                        "row_count": len(chunk_rows),
                    },
                }
                chunk_rows = []
        
        # Emit remaining
        if chunk_rows:
            yield {
                "content": str(chunk_rows),
                "metadata": {
                    "row_count": len(chunk_rows),
                },
            }
```