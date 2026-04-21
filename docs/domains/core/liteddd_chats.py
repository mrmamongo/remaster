# Chats Domain — LiteDDD Implementation

## Domain Layer

```python
# domain/chats/entities.py
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from typing import Optional


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict
    output: Optional[str] = None


@dataclass
class Usage:
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    input_cost: float = 0.0
    output_cost: float = 0.0
    
    @property
    def total_cost(self) -> float:
        return self.input_cost + self.output_cost


@dataclass
class Message:
    id: UUID
    chat_id: UUID
    role: MessageRole
    content: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    tool_call_id: Optional[str] = None
    model: Optional[str] = None
    usage: Optional[Usage] = None
    metadata: dict = field(default_factory=dict)
    created_at: datetime
    
    @classmethod
    def create_user_message(cls, chat_id: UUID, content: str) -> "Message":
        return cls(
            id=uuid4(),
            chat_id=chat_id,
            role=MessageRole.USER,
            content=content,
            created_at=datetime.utcnow(),
        )
    
    @classmethod
    def create_assistant_message(
        cls,
        chat_id: UUID,
        content: str,
        model: str,
        usage: Usage,
        tool_calls: list[ToolCall] = None,
    ) -> "Message":
        return cls(
            id=uuid4(),
            chat_id=chat_id,
            role=MessageRole.ASSISTANT,
            content=content,
            model=model,
            usage=usage,
            tool_calls=tool_calls or [],
            created_at=datetime.utcnow(),
        )
    
    @classmethod
    def create_tool_message(
        cls,
        chat_id: UUID,
        tool_call_id: str,
        content: str,
    ) -> "Message":
        return cls(
            id=uuid4(),
            chat_id=chat_id,
            role=MessageRole.TOOL,
            content=content,
            tool_call_id=tool_call_id,
            created_at=datetime.utcnow(),
        )


@dataclass
class Chat:
    id: UUID
    user_id: UUID
    title: str
    agent_id: Optional[UUID] = None
    metadata: dict = field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def create(cls, user_id: UUID, title: str = "New Chat", agent_id: UUID = None) -> "Chat":
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            user_id=user_id,
            title=title,
            agent_id=agent_id,
            created_at=now,
            updated_at=now,
        )
    
    def update_title(self, title: str) -> None:
        self.title = title
        self.updated_at = datetime.utcnow()
    
    def set_agent(self, agent_id: UUID) -> None:
        self.agent_id = agent_id
        self.updated_at = datetime.utcnow()
```

## Application Layer

```python
# application/chats/services.py
from dataclasses import dataclass
from uuid import UUID
from typing import Optional
from dishka import Provider, Scope, provide

from domain.chats.entities import Chat, Message, MessageRole
from domain.chats.interfaces import ChatRepository, MessageRepository


@dataclass
class CreateChatCommand:
    user_id: UUID
    title: str = "New Chat"
    agent_id: Optional[UUID] = None


@dataclass
class SendMessageCommand:
    chat_id: UUID
    user_id: UUID
    content: str


@dataclass
class CreateChatQuery:
    chat_id: UUID


@dataclass
class GetMessagesQuery:
    chat_id: UUID
    limit: int = 50
    before_message_id: Optional[UUID] = None


class ChatApplicationService:
    def __init__(
        self,
        chat_repo: ChatRepository,
        message_repo: MessageRepository,
    ):
        self._chat_repo = chat_repo
        self._message_repo = message_repo
    
    def create_chat(self, cmd: CreateChatCommand) -> Chat:
        chat = Chat.create(
            user_id=cmd.user_id,
            title=cmd.title,
            agent_id=cmd.agent_id,
        )
        self._chat_repo.save(chat)
        
        # Add system message if agent is set
        if cmd.agent_id:
            msg = Message(
                id=uuid4(),
                chat_id=chat.id,
                role=MessageRole.SYSTEM,
                content=f"Chat started with agent {cmd.agent_id}",
                created_at=datetime.utcnow(),
            )
            self._message_repo.save(msg)
        
        return chat
    
    def send_message(self, cmd: SendMessageCommand) -> Message:
        chat = self._chat_repo.get_by_id(cmd.chat_id)
        if chat is None:
            raise ValueError(f"Chat not found: {cmd.chat_id}")
        
        if chat.user_id != cmd.user_id:
            raise PermissionError("User does not own this chat")
        
        message = Message.create_user_message(
            chat_id=cmd.chat_id,
            content=cmd.content,
        )
        self._message_repo.save(message)
        
        # Update chat timestamp
        chat.updated_at = datetime.utcnow()
        self._chat_repo.save(chat)
        
        return message
    
    def get_chat(self, query: CreateChatQuery) -> Chat | None:
        return self._chat_repo.get_by_id(query.chat_id)
    
    def get_messages(self, query: GetMessagesQuery) -> list[Message]:
        return self._message_repo.list_by_chat(
            chat_id=query.chat_id,
            limit=query.limit,
            before_message_id=query.before_message_id,
        )
    
    def list_chats(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[Chat]:
        return self._chat_repo.list_by_user(
            user_id=user_id,
            limit=limit,
            offset=offset,
        )
```

## Infrastructure Layer

```python
# infrastructure/chats/repository.py
from uuid import UUID
from typing import Optional
from sqlalchemy import Column, String, DateTime, Enum, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Session

from domain.chats.entities import Chat, Message, MessageRole
from domain.chats.interfaces import ChatRepository, MessageRepository


class ChatModel(Base):
    __tablename__ = "chats"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    user_id = Column(PGUUID(as_uuid=True), nullable=False)
    title = Column(String(512), nullable=False)
    agent_id = Column(PGUUID(as_uuid=True), nullable=True)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)


class MessageModel(Base):
    __tablename__ = "messages"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    chat_id = Column(PGUUID(as_uuid=True), ForeignKey("chats.id"), nullable=False)
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(String, nullable=False)  # Large text
    tool_calls = Column(JSON, nullable=True)
    tool_call_id = Column(String, nullable=True)
    model = Column(String, nullable=True)
    usage = Column(JSON, nullable=True)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False)


class SQLAlchemyChatRepository(ChatRepository):
    def __init__(self, session: Session):
        self._session = session
    
    def save(self, chat: Chat) -> None:
        model = self._session.query(ChatModel).filter_by(id=chat.id).first()
        
        if model is None:
            model = ChatModel(id=chat.id)
            self._session.add(model)
        
        model.user_id = chat.user_id
        model.title = chat.title
        model.agent_id = chat.agent_id
        model.metadata = chat.metadata
        model.created_at = chat.created_at
        model.updated_at = chat.updated_at
        
        self._session.commit()
    
    def get_by_id(self, chat_id: UUID) -> Chat | None:
        model = self._session.query(ChatModel).filter_by(id=chat_id).first()
        if model is None:
            return None
        return self._to_entity(model)
    
    def list_by_user(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Chat]:
        models = (
            self._session.query(ChatModel)
            .filter_by(user_id=user_id)
            .order_by(ChatModel.updated_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return [self._to_entity(m) for m in models]
    
    def _to_entity(self, model: ChatModel) -> Chat:
        return Chat(
            id=model.id,
            user_id=model.user_id,
            title=model.title,
            agent_id=model.agent_id,
            metadata=model.metadata or {},
            created_at=model.created_at,
            updated_at=model.updated_at,
        )


class SQLAlchemyMessageRepository(MessageRepository):
    def __init__(self, session: Session):
        self._session = session
    
    def save(self, message: Message) -> None:
        model = self._session.query(MessageModel).filter_by(id=message.id).first()
        
        if model is None:
            model = MessageModel(id=message.id)
            self._session.add(model)
        
        model.chat_id = message.chat_id
        model.role = message.role
        model.content = message.content
        model.tool_calls = [tc.__dict__ for tc in message.tool_calls]
        model.tool_call_id = message.tool_call_id
        model.model = message.model
        model.usage = message.usage.__dict__ if message.usage else None
        model.metadata = message.metadata
        model.created_at = message.created_at
        
        self._session.commit()
    
    def list_by_chat(
        self,
        chat_id: UUID,
        limit: int = 50,
        before_message_id: Optional[UUID] = None,
    ) -> list[Message]:
        query = self._session.query(MessageModel).filter_by(chat_id=chat_id)
        
        if before_message_id:
            # Cursor-based pagination
            before_msg = self._session.query(MessageModel).filter_by(id=before_message_id).first()
            if before_msg:
                query = query.filter(MessageModel.created_at < before_msg.created_at)
        
        models = (
            query.order_by(MessageModel.created_at.desc())
            .limit(limit)
            .all()
        )
        return [self._to_entity(m) for m in reversed(models)]
    
    def _to_entity(self, model: MessageModel) -> Message:
        tool_calls = []
        if model.tool_calls:
            for tc in model.tool_calls:
                tool_calls.append(ToolCall(**tc))
        
        usage = None
        if model.usage:
            usage = Usage(**model.usage)
        
        return Message(
            id=model.id,
            chat_id=model.chat_id,
            role=model.role,
            content=model.content,
            tool_calls=tool_calls,
            tool_call_id=model.tool_call_id,
            model=model.model,
            usage=usage,
            metadata=model.metadata or {},
            created_at=model.created_at,
        )
```