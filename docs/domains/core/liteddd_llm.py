# LLM Domain + NATS Agent Workers

## Domain Layer

```python
# domain/llm/entities.py
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from typing import Optional


class ModelProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GROQ = "groq"
    LOCAL = "local"  # vLLM / SGLang


class ModelModality(str, Enum):
    CHAT = "chat"
    EMBEDDINGS_DENSE = "embeddings_dense"
    EMBEDDINGS_SPARSE = "embeddings_sparse"
    EMBEDDINGS_RERANK = "embeddings_rerank"
    VISION = "vision"
    OCR = "ocr"


@dataclass
class Pricing:
    price_per_input_token: float  # per 1M tokens
    price_per_output_token: float  # per 1M tokens
    
    def calculate(self, input_tokens: int, output_tokens: int) -> float:
        return (
            (input_tokens * self.price_per_input_token / 1_000_000) +
            (output_tokens * self.price_per_output_token / 1_000_000)
        )


@dataclass
class Model:
    id: UUID
    name: str  # e.g., "gpt-4o", "llama-3-70b"
    provider: ModelProvider
    modality: ModelModality
    endpoint: Optional[str] = None  # For local models
    api_key_ref: Optional[str] = None  # Infisical reference
    config: dict = field(default_factory=dict)
    pricing: Optional[Pricing] = None
    is_active: bool = True
    is_default: bool = False
    capabilities: list[str] = field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def create_openai(
        cls,
        name: str,
        modality: ModelModality,
        api_key_ref: str,
        pricing: Pricing,
        config: dict = None,
    ) -> "Model":
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            name=name,
            provider=ModelProvider.OPENAI,
            modality=modality,
            api_key_ref=api_key_ref,
            pricing=pricing,
            config=config or {},
            capabilities=["streaming", "tools"],
            created_at=now,
            updated_at=now,
        )
    
    @classmethod
    def create_local(
        cls,
        name: str,
        endpoint: str,
        modality: ModelModality,
        config: dict = None,
    ) -> "Model":
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            name=name,
            provider=ModelProvider.LOCAL,
            modality=modality,
            endpoint=endpoint,
            pricing=None,  # Local models no API cost
            config=config or {},
            capabilities=["streaming", "tools"],
            created_at=now,
            updated_at=now,
        )
    
    def supports_capability(self, cap: str) -> bool:
        return cap in self.capabilities


# LLM Request/Response
@dataclass
class ChatMessage:
    role: str  # "system", "user", "assistant", "tool"
    content: str
    tool_call_id: Optional[str] = None


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class ChatRequest:
    model_id: UUID
    messages: list[ChatMessage]
    tools: list[dict] = None
    temperature: float = 1.0
    max_tokens: Optional[int] = None
    stream: bool = False


@dataclass
class ChatResponse:
    content: str
    model: str
    tool_calls: list[ToolCall] = None
    usage: dict = None  # prompt_tokens, completion_tokens, total_tokens
    finish_reason: str = "stop"


# Embedding Request/Response
@dataclass
class EmbeddingRequest:
    model_id: UUID
    texts: list[str]


@dataclass
class EmbeddingResponse:
    embeddings: list[list[float]]
    model: str
    usage: dict = None
```

## NATS Request-Reply Pattern

```python
# infrastructure/llm/nats_client.py
import asyncio
import json
from typing import AsyncGenerator
import nats
from nats.errors import NatsError

from domain.llm.entities import ChatRequest, ChatResponse


class NATSLLMGateway:
    """NATS-based LLM gateway for agent workers."""
    
    def __init__(self, nats_url: str = "nats://localhost:4222"):
        self._nats_url = nats_url
        self._nc = None
        self._workers = set()  # Available worker IDs
    
    async def connect(self) -> None:
        self._nc = await nats.connect(self._nats_url)
    
    async def close(self) -> None:
        if self._nc:
            await self._nc.close()
    
    async def register_worker(self, worker_id: str) -> None:
        """Register this instance as a worker."""
        self._workers.add(worker_id)
    
    async def chat(
        self,
        worker_id: str,
        request: ChatRequest,
        stream: bool = False,
    ) -> AsyncGenerator[str, None] | ChatResponse:
        """Send chat request to specific worker."""
        subject = f"llm.inference.{worker_id}.request"
        
        # Serialize request
        payload = {
            "model_id": str(request.model_id),
            "messages": [
                {"role": m.role, "content": m.content}
                for m in request.messages
            ],
            "tools": request.tools,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": stream,
        }
        
        if stream:
            # Subscribe to response stream
            response_subj = f"llm.inference.{worker_id}.response"
            sub = await self._nc.subscribe(response_subj)
            
            # Publish request
            await self._nc.publish(subject, json.dumps(payload).encode())
            
            async for msg in sub.messages:
                data = json.loads(msg.data.decode())
                
                if data.get("type") == "error":
                    raise Exception(data["error"])
                
                if data.get("type") == "done":
                    break
                
                yield data.get("content", "")
        else:
            # Request-reply
            response = await self._nc.request(
                subject,
                json.dumps(payload).encode(),
                timeout=60.0,
            )
            
            data = json.loads(response.data.decode())
            
            if "error" in data:
                raise Exception(data["error"])
            
            return ChatResponse(
                content=data["content"],
                model=data["model"],
                tool_calls=data.get("tool_calls"),
                usage=data.get("usage"),
                finish_reason=data.get("finish_reason", "stop"),
            )
    
    async def embed(
        self,
        worker_id: str,
        request: "EmbeddingRequest",
    ) -> "EmbeddingResponse":
        """Send embedding request to worker."""
        # Similar to chat but for embeddings
        pass


# Agent Worker Service
class LLMWorkerService:
    """Worker that handles LLM inference requests."""
    
    def __init__(
        self,
        worker_id: str,
        model_id: UUID,
        nats_url: str = "nats://localhost:4222",
    ):
        self.worker_id = worker_id
        self.model_id = model_id
        self._nats_url = nats_url
        self._nc = None
    
    async def start(self) -> None:
        """Start worker and subscribe to requests."""
        self._nc = await nats.connect(self._nats_url)
        
        subject = f"llm.inference.{self.worker_id}.request"
        
        await self._nc.subscribe(subject, cb=self._handle_request)
        
        print(f"Worker {self.worker_id} started, listening on {subject}")
    
    async def _handle_request(self, msg) -> None:
        """Handle incoming LLM request."""
        request = json.loads(msg.data.decode())
        
        try:
            # Process request with local model (vLLM/SGLang)
            result = await self._inference(request)
            
            response = json.dumps({
                "content": result.content,
                "model": str(self.model_id),
                "usage": result.usage,
                "tool_calls": [
                    {"id": tc.id, "name": tc.name, "arguments": tc.arguments}
                    for tc in (result.tool_calls or [])
                ],
                "finish_reason": result.finish_reason,
            })
            
        except Exception as e:
            response = json.dumps({"error": str(e)})
        
        # Send response
        response_subj = f"llm.inference.{self.worker_id}.response"
        await self._nc.publish(response_subj, response.encode())
    
    async def _inference(self, request: dict) -> ChatResponse:
        """Run inference with local model."""
        # This would call vLLM/SGLang API
        # Placeholder implementation
        return ChatResponse(
            content="Response from local model",
            model=str(self.model_id),
            usage={"prompt_tokens": 0, "completion_tokens": 0},
        )
    
    async def stop(self) -> None:
        """Stop worker."""
        if self._nc:
            await self._nc.close()


# Example: Running workers
async def main():
    # Start multiple workers
    workers = [
        LLMWorkerService(f"worker-{i}", UUID("..."))
        for i in range(4)  # 4 GPU workers
    ]
    
    await asyncio.gather(*[w.start() for w in workers])
    
    # Keep running
    await asyncio.Event().wait()
```

## Model Router (Application Layer)

```python
# application/llm/router.py
from uuid import UUID
from typing import Optional
from dataclasses import dataclass

from domain.llm.entities import Model, ModelProvider, ModelModality


class ModelRouter:
    """Routes requests to appropriate model."""
    
    def __init__(self, model_repo):
        self._model_repo = model_repo
    
    def select_model(
        self,
        modality: ModelModality,
        user_tier: str = "free",
        preferred_provider: Optional[ModelProvider] = None,
    ) -> Model:
        """Select best model for the request."""
        
        # Get all active models for modality
        models = self._model_repo.list_by_modality(modality)
        
        # Filter by availability
        models = [m for m in models if m.is_active]
        
        if not models:
            raise ValueError(f"No active models for modality: {modality}")
        
        # Filter by provider preference
        if preferred_provider:
            models = [m for m in models if m.provider == preferred_provider]
        
        # Filter by tier (rate limits could be checked here)
        # For now, just return first available
        return models[0]
    
    def get_fallbacks(
        self,
        modality: ModelModality,
        primary_model_id: UUID,
    ) -> list[Model]:
        """Get fallback chain for model."""
        # Returns other models of same modality as fallbacks
        models = self._model_repo.list_by_modality(modality)
        return [m for m in models if m.id != primary_model_id and m.is_active]
```

## API Gateway

```python
# application/llm/gateway.py
from typing import AsyncGenerator
from domain.llm.entities import ChatRequest, ChatResponse, EmbeddingRequest
from domain.llm.router import ModelRouter


class LLMGateway:
    """Unified LLM gateway for all providers."""
    
    def __init__(self, model_router: ModelRouter, nats_client: NATSLLMGateway):
        self._router = model_router
        self._nats = nats_client
    
    async def chat(
        self,
        model_id: UUID,
        messages: list[dict],
        tools: list[dict] = None,
        stream: bool = False,
    ) -> AsyncGenerator[str, None] | ChatResponse:
        """Send chat request to model."""
        
        # Get model
        model = self._router.get_by_id(model_id)
        
        if model.provider == ModelProvider.LOCAL:
            # Send to NATS worker
            worker_id = self._select_worker(model_id)
            return await self._nats.chat(worker_id, request, stream)
        
        elif model.provider == ModelProvider.OPENAI:
            return await self._openai_chat(model, messages, tools, stream)
        
        elif model.provider == ModelProvider.ANTHROPIC:
            return await self._anthropic_chat(model, messages, tools, stream)
        
        else:
            raise ValueError(f"Unknown provider: {model.provider}")
    
    async def embed(
        self,
        model_id: UUID,
        texts: list[str],
    ) -> list[list[float]]:
        """Get embeddings for texts."""
        model = self._router.get_by_id(model_id)
        
        if model.provider == ModelProvider.LOCAL:
            # Send to embedding worker
            worker_id = self._select_worker(model_id, "embed")
            return await self._nats.embed(worker_id, request)
        
        # Cloud providers...
    
    def _select_worker(self, model_id: UUID, role: str = "chat") -> str:
        """Select worker for model. Simple round-robin or based on load."""
        # This would track worker loads and select least loaded
        return f"worker-{model_id}-{role}-0"
```