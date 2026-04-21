# MCP Domain + Admin Domain

## MCP Domain (Model Context Protocol)

```python
# domain/mcp/entities.py
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from typing import Optional


class MCPAuthType(str, Enum):
    NONE = "none"
    OAUTH2 = "oauth2"
    API_KEY = "api_key"


class MCPServerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


@dataclass
class MCPServer:
    id: UUID
    name: str
    description: str
    owner_id: UUID
    url: str
    auth_type: MCPAuthType
    auth_config: dict = field(default_factory=dict)  # Encrypted
    tools: list[dict] = field(default_factory=list)
    status: MCPServerStatus = MCPServerStatus.INACTIVE
    metadata: dict = field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def create(
        cls,
        name: str,
        description: str,
        owner_id: UUID,
        url: str,
        auth_type: MCPAuthType = MCPAuthType.NONE,
    ) -> "MCPServer":
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            name=name,
            description=description,
            owner_id=owner_id,
            url=url,
            auth_type=auth_type,
            created_at=now,
            updated_at=now,
        )
    
    def activate(self) -> None:
        self.status = MCPServerStatus.ACTIVE
        self.updated_at = datetime.utcnow()
    
    def deactivate(self) -> None:
        self.status = MCPServerStatus.INACTIVE
        self.updated_at = datetime.utcnow()
    
    def mark_error(self, error: str) -> None:
        self.status = MCPServerStatus.ERROR
        self.metadata["last_error"] = error
        self.updated_at = datetime.utcnow()


# MCP Request/Response (JSON-RPC 2.0)
@dataclass
class JSONRPCRequest:
    jsonrpc: str = "2.0"
    id: str
    method: str
    params: dict = field(default_factory=dict)


@dataclass
class JSONRPCResponse:
    jsonrpc: str = "2.0"
    id: str
    result: Optional[dict] = None
    error: Optional[dict] = None
```

## Application Layer

```python
# application/mcp/services.py
import httpx
import json
from dataclasses import dataclass
from uuid import UUID
from typing import Optional

from domain.mcp.entities import MCPServer, MCPAuthType, MCPServerStatus


class MCPGateway:
    """MCP Protocol gateway."""
    
    def __init__(self, http_client: httpx.AsyncClient):
        self._client = http_client
    
    async def list_tools(self, server: MCPServer) -> list[dict]:
        """Call tools/list method."""
        request = {
            "jsonrpc": "2.0",
            "id": str(uuid4()),
            "method": "tools/list",
            "params": {},
        }
        
        response = await self._call_server(server, request)
        return response.get("result", {}).get("tools", [])
    
    async def call_tool(
        self,
        server: MCPServer,
        tool_name: str,
        arguments: dict,
    ) -> dict:
        """Call a specific tool."""
        request = {
            "jsonrpc": "2.0",
            "id": str(uuid4()),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        }
        
        response = await self._call_server(server, request)
        return response.get("result", {})
    
    async def _call_server(self, server: MCPServer, request: dict) -> dict:
        """Make JSON-RPC call to MCP server."""
        # Add auth headers
        headers = self._get_auth_headers(server)
        
        response = await self._client.post(
            server.url,
            json=request,
            headers=headers,
            timeout=30.0,
        )
        
        response.raise_for_status()
        return response.json()
    
    def _get_auth_headers(self, server: MCPServer) -> dict:
        """Get auth headers based on auth type."""
        if server.auth_type == MCPAuthType.NONE:
            return {}
        
        elif server.auth_type == MCPAuthType.API_KEY:
            return {"Authorization": f"Bearer {server.auth_config.get('api_key')}"}
        
        elif server.auth_type == MCPAuthType.OAUTH2:
            # Would use OAuth token
            return {"Authorization": f"Bearer {server.auth_config.get('access_token')}"}
        
        return {}
```

## Admin Domain

```python
# domain/admin/entities.py
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum


class ConfigCategory(str, Enum):
    MODELS = "models"
    RATE_LIMITS = "rate_limits"
    FEATURES = "features"
    SYSTEM = "system"


@dataclass
class SystemConfig:
    id: UUID
    key: str
    value: any  # JSON
    category: ConfigCategory
    is_editable: bool = True
    description: str = ""
    updated_at: datetime
    updated_by: UUID
    
    @classmethod
    def create(
        cls,
        key: str,
        value: any,
        category: ConfigCategory,
        description: str = "",
    ) -> "SystemConfig":
        return cls(
            id=uuid4(),
            key=key,
            value=value,
            category=category,
            description=description,
            updated_at=datetime.utcnow(),
            updated_by=UUID("00000000-0000-0000-0000-000000000000"),  # System
        )
    
    def update(self, value: any, updated_by: UUID) -> None:
        if not self.is_editable:
            raise ValueError(f"Config {self.key} is not editable")
        self.value = value
        self.updated_at = datetime.utcnow()
        self.updated_by = updated_by


@dataclass
class AuditLog:
    id: UUID
    user_id: UUID
    action: str  # "create", "update", "delete"
    entity_type: str  # "user", "agent", "model", etc.
    entity_id: UUID
    changes: dict = field(default_factory=dict)
    timestamp: datetime
    
    @classmethod
    def create(
        cls,
        user_id: UUID,
        action: str,
        entity_type: str,
        entity_id: UUID,
        changes: dict = None,
    ) -> "AuditLog":
        return cls(
            id=uuid4(),
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            changes=changes or {},
            timestamp=datetime.utcnow(),
        )
```

## Admin Panel API

```python
# application/admin/services.py
from dataclasses import dataclass
from uuid import UUID
from typing import Optional
from datetime import datetime, timedelta

from domain.admin.entities import SystemConfig, AuditLog, ConfigCategory


@dataclass
class UpdateConfigCommand:
    key: str
    value: any
    updated_by: UUID


class AdminService:
    """Admin panel service."""
    
    def __init__(
        self,
        config_repo,
        audit_repo,
        user_repo,
        model_repo,
        agent_repo,
        kb_repo,
        mcp_repo,
    ):
        self._config_repo = config_repo
        self._audit_repo = audit_repo
        self._user_repo = user_repo
        self._model_repo = model_repo
        self._agent_repo = agent_repo
        self._kb_repo = kb_repo
        self._mcp_repo = mcp_repo
    
    # === Config Management ===
    def get_config(self, key: str) -> Optional[SystemConfig]:
        return self._config_repo.get_by_key(key)
    
    def list_configs(self, category: Optional[ConfigCategory] = None) -> list[SystemConfig]:
        return self._config_repo.list(category)
    
    def update_config(self, cmd: UpdateConfigCommand) -> SystemConfig:
        config = self._config_repo.get_by_key(cmd.key)
        if config is None:
            raise ValueError(f"Config not found: {cmd.key}")
        
        config.update(cmd.value, cmd.updated_by)
        self._config_repo.save(config)
        
        self._audit_repo.save(AuditLog.create(
            user_id=cmd.updated_by,
            action="update",
            entity_type="config",
            entity_id=config.id,
            changes={"key": cmd.key, "value": cmd.value},
        ))
        
        return config
    
    # === Audit Logs ===
    def get_audit_logs(
        self,
        entity_type: Optional[str] = None,
        user_id: Optional[UUID] = None,
        from_date: Optional[datetime] = None,
        limit: int = 100,
    ) -> list[AuditLog]:
        return self._audit_repo.list(
            entity_type=entity_type,
            user_id=user_id,
            from_date=from_date or (datetime.utcnow() - timedelta(days=7)),
            limit=limit,
        )
    
    # === Dashboard Metrics (from Victoria) ===
    def get_metrics(self, metric_name: str, from_: datetime, to: datetime) -> list[dict]:
        """Get metrics from Victoria Metrics."""
        # This would query Victoria Metrics API
        # Placeholder - real implementation would use PromQL
        return []
    
    def get_traces(self, service: str, from_: datetime, to: datetime) -> list[dict]:
        """Get traces from Victoria Tempo."""
        # This would query Tempo API
        return []
```

## Admin API Endpoints

```python
# FastAPI routes for admin
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

router = APIRouter(prefix="/api/admin", tags=["admin"])


# === Users ===
@router.get("/users")
def list_users(limit: int = 100, offset: int = 0):
    return service.list_users(limit, offset)


@router.patch("/users/{user_id}")
def update_user(user_id: UUID, data: dict):
    return service.update_user(user_id, data)


@router.delete("/users/{user_id}")
def delete_user(user_id: UUID):
    service.delete_user(user_id)


# === Models ===
@router.get("/models")
def list_models():
    return model_service.list_all()


@router.post("/models")
def create_model(data: dict):
    return model_service.create(data)


@router.patch("/models/{model_id}")
def update_model(model_id: UUID, data: dict):
    return model_service.update(model_id, data)


@router.delete("/models/{model_id}")
def delete_model(model_id: UUID):
    model_service.delete(model_id)


# === Config ===
@router.get("/config")
def list_config(category: Optional[str] = None):
    return admin_service.list_configs(category)


@router.patch("/config/{key}")
def update_config(key: str, value: any, user_id: UUID):
    return admin_service.update_config(UpdateConfigCommand(key, value, user_id))


# === Logs & Metrics ===
@router.get("/logs")
def get_logs(
    entity_type: Optional[str] = None,
    user_id: Optional[UUID] = None,
    from_: Optional[datetime] = None,
    limit: int = 100,
):
    return admin_service.get_audit_logs(entity_type, user_id, from_, limit)


@router.get("/metrics")
def get_metrics(metric: str, from_: datetime, to: datetime):
    return admin_service.get_metrics(metric, from_, to)


@router.get("/traces")
def get_traces(service: str, from_: datetime, to: datetime):
    return admin_service.get_traces(service, from_, to)
```