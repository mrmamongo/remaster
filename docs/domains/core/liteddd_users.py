# Users Domain — LiteDDD Implementation

## 2.1 Domain Layer

```python
# domain/users/entities.py
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum


class UserStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    API_USER = "api_user"


@dataclass
class UserPreferences:
    theme: str = "system"
    language: str = "en"
    notifications: dict = None
    
    def __post_init__(self):
        if self.notifications is None:
            self.notifications = {"email": True, "push": True}


@dataclass
class User:
    id: UUID
    ory_identity_id: str
    email: str
    status: UserStatus
    role: UserRole
    preferences: UserPreferences
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    
    @classmethod
    def create(cls, ory_identity_id: str, email: str, role: UserRole = UserRole.USER) -> "User":
        now = datetime.utcnow()
        return cls(
            id=uuid4(),
            ory_identity_id=ory_identity_id,
            email=email,
            status=UserStatus.ACTIVE,
            role=role,
            preferences=UserPreferences(),
            created_at=now,
            updated_at=now,
        )
    
    def suspend(self) -> None:
        if self.status != UserStatus.ACTIVE:
            raise ValueError(f"Cannot suspend user with status {self.status}")
        self.status = UserStatus.SUSPENDED
        self.updated_at = datetime.utcnow()
    
    def delete(self) -> None:
        """Soft delete"""
        if self.status == UserStatus.DELETED:
            raise ValueError("User already deleted")
        self.status = UserStatus.DELETED
        self.deleted_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def update_preferences(self, preferences: UserPreferences) -> None:
        self.preferences = preferences
        self.updated_at = datetime.utcnow()
    
    @property
    def is_active(self) -> bool:
        return self.status == UserStatus.ACTIVE


# domain/users/value_objects.py
from dataclasses import dataclass


@dataclass(frozen=True)
class Email:
    value: str
    
    def __post_init__(self):
        if not self.value or "@" not in self.value:
            raise ValueError(f"Invalid email: {self.value}")
    
    def __str__(self) -> str:
        return self.value
```

## 2.2 Application Layer

```python
# application/users/commands.py
from dataclasses import dataclass
from uuid import UUID
from typing import Optional
from dishka import Provider, Scope, provide

from domain.users.entities import User, UserStatus, UserRole, UserPreferences
from domain.users.interfaces import UserRepository


@dataclass
class CreateUserCommand:
    ory_identity_id: str
    email: str
    role: UserRole = UserRole.USER


@dataclass
class UpdateUserCommand:
    user_id: UUID
    email: Optional[str] = None
    role: Optional[UserRole] = None
    preferences: Optional[UserPreferences] = None


@dataclass  
class DeleteUserCommand:
    user_id: UUID


# application/users/queries.py
from domain.users.interfaces import UserRepository


@dataclass
class GetUserByIdQuery:
    user_id: UUID


@dataclass
class GetUserByEmailQuery:
    email: str


@dataclass
class ListUsersQuery:
    status: Optional[UserStatus] = None
    role: Optional[UserRole] = None
    limit: int = 100
    offset: int = 0


# application/users/services.py
from dishka import Provider, Scope, provide, container_cls

from domain.users.entities import User
from domain.users.interfaces import UserRepository


class UserApplicationService:
    def __init__(self, user_repo: UserRepository):
        self._user_repo = user_repo
    
    def create_user(self, cmd: CreateUserCommand) -> User:
        user = User.create(
            ory_identity_id=cmd.ory_identity_id,
            email=cmd.email,
            role=cmd.role,
        )
        self._user_repo.save(user)
        return user
    
    def update_user(self, cmd: UpdateUserCommand) -> User:
        user = self._user_repo.get_by_id(cmd.user_id)
        if user is None:
            raise ValueError(f"User not found: {cmd.user_id}")
        
        if cmd.email is not None:
            user.email = cmd.email
        if cmd.role is not None:
            user.role = cmd.role
        if cmd.preferences is not None:
            user.update_preferences(cmd.preferences)
        
        self._user_repo.save(user)
        return user
    
    def delete_user(self, cmd: DeleteUserCommand) -> None:
        user = self._user_repo.get_by_id(cmd.user_id)
        if user is None:
            raise ValueError(f"User not found: {cmd.user_id}")
        user.delete()
        self._user_repo.save(user)
    
    def get_user(self, query: GetUserByIdQuery) -> User | None:
        return self._user_repo.get_by_id(query.user_id)
    
    def get_user_by_email(self, query: GetUserByEmailQuery) -> User | None:
        return self._user_repo.get_by_email(query.email)
    
    def list_users(self, query: ListUsersQuery) -> list[User]:
        return self._user_repo.list(
            status=query.status,
            role=query.role,
            limit=query.limit,
            offset=query.offset,
        )
```

## 2.3 Infrastructure Layer

```python
# infrastructure/users/repository.py
from uuid import UUID
from typing import Optional
from sqlalchemy import Column, String, DateTime, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Session

from domain.users.entities import User, UserStatus, UserRole, UserPreferences
from domain.users.interfaces import UserRepository


# SQLAlchemy model (table mapping)
from database import Base


class UserModel(Base):
    __tablename__ = "users"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True)
    ory_identity_id = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.USER)
    preferences = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    deleted_at = Column(DateTime, nullable=True)


class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, session: Session):
        self._session = session
    
    def save(self, user: User) -> None:
        model = self._session.query(UserModel).filter_by(id=user.id).first()
        
        if model is None:
            model = UserModel(id=user.id)
            self._session.add(model)
        
        model.ory_identity_id = user.ory_identity_id
        model.email = user.email
        model.status = user.status
        model.role = user.role
        model.preferences = user.preferences.__dict__ if user.preferences else None
        model.created_at = user.created_at
        model.updated_at = user.updated_at
        model.deleted_at = user.deleted_at
        
        self._session.commit()
    
    def get_by_id(self, user_id: UUID) -> User | None:
        model = self._session.query(UserModel).filter_by(id=user_id).first()
        if model is None:
            return None
        return self._to_entity(model)
    
    def get_by_email(self, email: str) -> User | None:
        model = self._session.query(UserModel).filter_by(email=email).first()
        if model is None:
            return None
        return self._to_entity(model)
    
    def list(
        self, 
        status: Optional[UserStatus] = None,
        role: Optional[UserRole] = None,
        limit: int = 100,
        offset: int = 0
    ) -> list[User]:
        query = self._session.query(UserModel)
        
        if status is not None:
            query = query.filter_by(status=status)
        if role is not None:
            query = query.filter_by(role=role)
        
        models = query.offset(offset).limit(limit).all()
        return [self._to_entity(m) for m in models]
    
    def _to_entity(self, model: UserModel) -> User:
        prefs = None
        if model.preferences:
            prefs = UserPreferences(**model.preferences)
        
        return User(
            id=model.id,
            ory_identity_id=model.ory_identity_id,
            email=model.email,
            status=model.status,
            role=model.role,
            preferences=prefs,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
        )
```

## 2.4 Dependency Injection

```python
# infrastructure/dependencies.py
from dishka import Provider, Scope, provide, container_cls

from application.users.services import UserApplicationService
from infrastructure.users.repository import SQLAlchemyUserRepository


class UserProvider(Provider):
    scope = Scope.REQUEST
    
    @provide
    def user_repository(self) -> SQLAlchemyUserRepository:
        # Session получаем из Database connection
        session = get_db_session()
        return SQLAlchemyUserRepository(session)
    
    @provide
    def user_service(self, repo: SQLAlchemyUserRepository) -> UserApplicationService:
        return UserApplicationService(repo)


# container setup
from dishka import Container

container = Container()
container.add_provider(UserProvider)


# Usage in FastAPI
from fastapi import Depends

def get_user_service() -> UserApplicationService:
    return container.resolve(UserApplicationService)


@app.post("/api/users")
def create_user(
    cmd: CreateUserCommand,
    service: UserApplicationService = Depends(get_user_service)
):
    user = service.create_user(cmd)
    return user
```