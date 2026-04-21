# Agents Domain — ReAct Loop Implementation

## Domain Layer

```python
# domain/agents/entities.py
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from typing import Optional


class OwnerType(str, Enum):
    USER = "user"
    PLATFORM = "platform"
    GROUP = "group"


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_HITL = "waiting_hitl"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: dict
    handler: str  # MCP server ID or internal handler


@dataclass
class Agent:
    id: UUID
    name: str
    description: str
    owner_type: OwnerType
    owner_id: UUID
    system_prompt: str
    model_id: UUID
    tools: list[ToolDefinition] = field(default_factory=list)
    max_turns: int = 10
    timeout_seconds: int = 300
    metadata: dict = field(default_factory=dict)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def create(
        cls,
        name: str,
        description: str,
        owner_id: UUID,
        owner_type: OwnerType,
        system_prompt: str,
        model_id: UUID,
        tools: list[ToolDefinition] = None,
        max_turns: int = 10,
    ) -> "Agent":
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            name=name,
            description=description,
            owner_id=owner_id,
            owner_type=owner_type,
            system_prompt=system_prompt,
            model_id=model_id,
            tools=tools or [],
            max_turns=max_turns,
            created_at=now,
            updated_at=now,
        )
    
    def deactivate(self) -> None:
        self.is_active = False
        self.updated_at = datetime.utcnow()
    
    def add_tool(self, tool: ToolDefinition) -> None:
        self.tools.append(tool)
        self.updated_at = datetime.utcnow()
    
    def remove_tool(self, tool_name: str) -> None:
        self.tools = [t for t in self.tools if t.name != tool_name]
        self.updated_at = datetime.utcnow()


@dataclass
class AgentExecution:
    id: UUID
    agent_id: UUID
    chat_id: UUID
    user_id: UUID
    status: ExecutionStatus
    current_turn: int = 0
    messages: list[dict] = field(default_factory=list)  # Serialized messages
    result: Optional[str] = None
    error: Optional[str] = None
    started_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    
    @classmethod
    def create(
        cls,
        agent_id: UUID,
        chat_id: UUID,
        user_id: UUID,
    ) -> "AgentExecution":
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            agent_id=agent_id,
            chat_id=chat_id,
            user_id=user_id,
            status=ExecutionStatus.PENDING,
            started_at=now,
            updated_at=now,
        )
    
    def start(self) -> None:
        self.status = ExecutionStatus.RUNNING
        self.updated_at = datetime.utcnow()
    
    def increment_turn(self) -> None:
        self.current_turn += 1
        self.updated_at = datetime.utcnow()
    
    def add_message(self, role: str, content: str) -> None:
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
        })
        self.updated_at = datetime.utcnow()
    
    def wait_for_hitl(self) -> None:
        self.status = ExecutionStatus.WAITING_HITL
        self.updated_at = datetime.utcnow()
    
    def continue_execution(self) -> None:
        self.status = ExecutionStatus.RUNNING
        self.updated_at = datetime.utcnow()
    
    def complete(self, result: str) -> None:
        self.status = ExecutionStatus.COMPLETED
        self.result = result
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def fail(self, error: str) -> None:
        self.status = ExecutionStatus.FAILED
        self.error = error
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    @property
    def is_terminal(self) -> bool:
        return self.status in (ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.PAUSED)
```

## Application Layer — ReAct Loop Service

```python
# application/agents/react_loop.py
from dataclasses import dataclass
from uuid import UUID
from typing import Optional, AsyncGenerator
import json
from dishka import Provider, Scope, provide

from domain.agents.entities import Agent, AgentExecution, ExecutionStatus, ToolDefinition
from domain.agents.interfaces import AgentRepository, ExecutionRepository
from domain.llm.interfaces import LLMGateway


@dataclass
class ExecuteAgentCommand:
    agent_id: UUID
    chat_id: UUID
    user_id: UUID
    input_message: str


class ReActLoopService:
    """ReAct Loop implementation for agents."""
    
    def __init__(
        self,
        agent_repo: AgentRepository,
        execution_repo: ExecutionRepository,
        llm_gateway: LLMGateway,
    ):
        self._agent_repo = agent_repo
        self._execution_repo = execution_repo
        self._llm_gateway = llm_gateway
    
    async def execute(
        self,
        cmd: ExecuteAgentCommand,
        stream: bool = True,
    ) -> AsyncGenerator[str, None]:
        """Execute agent with ReAct loop."""
        
        # Get agent
        agent = self._agent_repo.get_by_id(cmd.agent_id)
        if agent is None:
            raise ValueError(f"Agent not found: {cmd.agent_id}")
        
        if not agent.is_active:
            raise ValueError("Agent is not active")
        
        # Create execution
        execution = AgentExecution.create(
            agent_id=cmd.agent_id,
            chat_id=cmd.chat_id,
            user_id=cmd.user_id,
        )
        self._execution_repo.save(execution)
        
        execution.start()
        self._execution_repo.save(execution)
        
        # Build messages context
        messages = [
            {"role": "system", "content": agent.system_prompt},
            {"role": "user", "content": cmd.input_message},
        ]
        
        # ReAct loop
        while execution.current_turn < agent.max_turns and not execution.is_terminal:
            execution.increment_turn()
            self._execution_repo.save(execution)
            
            # Yield progress
            if stream:
                yield json.dumps({
                    "type": "turn",
                    "current": execution.current_turn,
                    "max": agent.max_turns,
                })
            
            # Call LLM
            response = await self._llm_gateway.chat(
                model_id=agent.model_id,
                messages=messages,
                tools=[self._tool_to_schema(t) for t in agent.tools],
                stream=stream,
            )
            
            if stream:
                async for chunk in response:
                    yield chunk
            else:
                result = await response
                
                # Check for tool calls
                if result.tool_calls:
                    for tc in result.tool_calls:
                        execution.add_message("assistant", result.content or "")
                        execution.add_message(
                            "tool",
                            json.dumps(tc),
                        )
                        
                        # Execute tool
                        tool_result = await self._execute_tool(tc, agent.tools)
                        
                        messages.append({
                            "role": "assistant",
                            "content": result.content,
                            "tool_calls": [tc],
                        })
                        messages.append({
                            "role": "tool",
                            "content": tool_result,
                            "tool_call_id": tc.id,
                        })
                        
                        if stream:
                            yield json.dumps({
                                "type": "tool_result",
                                "tool_name": tc.name,
                                "result": tool_result,
                            })
                else:
                    # No tool calls, completed
                    execution.add_message("assistant", result.content)
                    execution.complete(result.content)
                    self._execution_repo.save(execution)
                    
                    if stream:
                        yield json.dumps({
                            "type": "completed",
                            "result": result.content,
                        })
                    break
        
        # Max turns reached
        if not execution.is_terminal:
            execution.fail("Max turns reached")
            self._execution_repo.save(execution)
            
            if stream:
                yield json.dumps({
                    "type": "failed",
                    "error": "Max turns reached",
                })
    
    async def _execute_tool(
        self,
        tool_call: dict,
        available_tools: list[ToolDefinition],
    ) -> str:
        """Execute a tool call."""
        tool_name = tool_call.get("name")
        args = tool_call.get("arguments", {})
        
        # Find tool
        tool_def = next((t for t in available_tools if t.name == tool_name), None)
        if tool_def is None:
            return json.dumps({"error": f"Tool not found: {tool_name}"})
        
        # Execute via MCP or internal handler
        # This would call MCP gateway or internal service
        return json.dumps({"status": "success", "output": "..."})
    
    def _tool_to_schema(self, tool: ToolDefinition) -> dict:
        """Convert ToolDefinition to LLM tool schema."""
        return {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.input_schema,
            },
        }
```

## Infrastructure Layer

```python
# infrastructure/agents/repository.py
from uuid import UUID
from typing import Optional
from sqlalchemy import Column, String, DateTime, Enum, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Session
import json

from domain.agents.entities import Agent, AgentExecution, OwnerType, ExecutionStatus, ToolDefinition


class AgentModel(Base):
    __tablename__ = "agents"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    name = Column(String(512), nullable=False)
    description = Column(String, nullable=True)
    owner_type = Column(Enum(OwnerType), nullable=False)
    owner_id = Column(PGUUID(as_uuid=True), nullable=False)
    system_prompt = Column(String, nullable=False)
    model_id = Column(PGUUID(as_uuid=True), nullable=False)
    tools = Column(JSON, nullable=True)
    max_turns = Column(Integer, nullable=False, default=10)
    timeout_seconds = Column(Integer, nullable=False, default=300)
    metadata = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)


class ExecutionModel(Base):
    __tablename__ = "agent_executions"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    agent_id = Column(PGUUID(as_uuid=True), ForeignKey("agents.id"), nullable=False)
    chat_id = Column(PGUUID(as_uuid=True), nullable=False)
    user_id = Column(PGUUID(as_uuid=True), nullable=False)
    status = Column(Enum(ExecutionStatus), nullable=False)
    current_turn = Column(Integer, nullable=False, default=0)
    messages = Column(JSON, nullable=True)
    result = Column(String, nullable=True)
    error = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)


class SQLAlchemyAgentRepository:
    def save(self, agent: Agent) -> None:
        # ... implementation
        pass
    
    def get_by_id(self, agent_id: UUID) -> Optional[Agent]:
        # ... implementation
        pass
    
    def list_by_owner(self, owner_id: UUID) -> list[Agent]:
        # ... implementation
        pass
```