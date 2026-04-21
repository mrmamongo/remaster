# Dishka — Dependency Injection Guide

## Overview

Dishka — Python dependency injection framework с first-class async support. Главная особенность — явное управление scopes через AsyncContainer и clean separation of concerns.

## Scopes

| Scope | Когда создаётся | Когда очищается | Пример |
|-------|--------------|-----------------|-------|
| **APP** | При старте приложения | При shutdown | `Config`, `NATSClient`, `HTTPClient` |
| **REQUEST** | На каждый HTTP request | После response | `Session`, `Repositories`, `Services` |
| **RUNTIME** | При первом обращении | Никогда (singleton) | Кэш |
| **ACTION** | На один вызов метода | После вызова | Транзакции |

## AsyncContainer (Рекомендуется)

Dishka работает лучше всего с **AsyncContainer** — full async-first support:

```python
# main.py
import asyncio
from dishka import Provider, Scope, provide, make_async_container, AsyncContainer

# APP Scope — singletons
class AppProvider(Provider):
    scope = Scope.APP
    
    @provide
    def settings(self) -> AppSettings:
        """Created once at app start."""
        return AppSettings()
    
    @provide
    async def nats_client(self, settings: AppSettings) -> NATSClient:
        """Async client — app-wide singleton."""
        client = NATSClient()
        await client.connect(settings.nats_url)
        return client


# REQUEST Scope — per request
class RequestProvider(Provider):
    scope = Scope.REQUEST
    
    @provide
    def session(self) -> AsyncSession:
        """DB session for this request."""
        return create_session()
    
    @provide
    def user_repository(self, session: AsyncSession) -> UserRepository:
        return SQLAlchemyUserRepository(session)
    
    @provide
    def user_service(self, repo: UserRepository) -> UserService:
        return UserService(repo)


def create_container() -> AsyncContainer:
    """Создаём контейнер с providers."""
    return make_async_container(
        AppProvider(),
        RequestProvider(),
    )
```

## FastAPI Интеграция

```python
# main.py
from fastapi import FastAPI
from dishka.integrations.fastapi import setup_dishka, FromDishka
from dishka import make_async_container

app = FastAPI()

# Инициализация при старте
container = make_async_container(
    AppProvider(),
    RequestProvider(),
)

# setup_dishka автоматически добавляет middleware
# и управляет REQUEST scope lifecycle
setup_dishka(container=container, app=app)


# Использование в endpoint
@app.get("/users/{user_id}")
async def get_user(
    user_id: UUID,
    service: UserService = FromDishka(),  # REQUEST scoped
) -> UserResponse:
    return service.get_user(user_id)
```

## Container Lifecycle — Важно!

### Ручное управление (для background tasks)

```python
# Background task с отдельным scope
async def run_background_task():
    container = make_async_container(
        AppProvider(),
        RequestProvider(),
    )
    
    # Открываем REQUEST scope для этой операции
    async with container(scope=Scope.REQUEST) as req_container:
        service = await req_container.get(UserService)
        result = await service.process()
    
    await container.close()
```

### APP lifecycle startup/shutdown

```python
# main.py
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — создаём контейнер
    container = make_async_container(
        AppProvider(),  # APP scope providers
    )
    
    # Подключаем NATS
    nats = await container.get(NATSClient)
    await nats.connect()
    
    app.state.container = container
    
    yield
    
    # Shutdown
    await nats.close()
    await container.close()


app = FastAPI(lifespan=lifespan)
```

## Cross-Scope Dependencies

**Важно:** `FromDishka` нужен ТОЛЬКО вне Provider — в FastAPI endpoints или ручном коде. Внутри Provider он не нужен — Dishka автоматически resolвит dependencies.

```python
# Внутри Provider — FromDishka НЕ нужен (same scope автоматически)
class AppProvider(Provider):
    scope = Scope.APP
    
    @provide
    def settings(self) -> AppSettings:
        return AppSettings()
    
    @provide
    def client(self, settings: AppSettings) -> AppClient:
        # Работает без FromDishka — Dishka сам resolвит
        return AppClient(settings)


# REQUEST scoped использует APP scoped — автоматически
class RequestProvider(Provider):
    scope = Scope.REQUEST
    
    @provide
    def service(self, client: AppClient) -> RequestService:
        # Работает без FromDishka! Dishka знает про cross-scope
        return RequestService(client=client)


# ТОЛЬКО вне Provider — в endpoints
@app.get("/users/{user_id}")
async def get_user(
    service: UserService = FromDishka(),  # FromDishka НУЖЕН
) -> UserResponse:
    return service.get_user(user_id)
```

## Async Providers

Полностью async pipeline. **cleanup делает dishka сама** — просто `await container.close()`:

```python
class AppProvider(Provider):
    scope = Scope.APP
    
    @provide
    async def http_client(self) -> httpx.AsyncClient:
        """Async HTTP client."""
        return httpx.AsyncClient()
    
    @provide
    async def qdrant_client(self) -> QdrantClient:
        """Async vector DB client."""
        client = QdrantClient()
        await client.connect()
        return client


# ВСЁ! Никакого ручного cleanup
async def cleanup():
    await container.close()  # Dishka сама закрывает ВСЕ
```

## Provider Structure — Рекомендация

```
infrastructure/
├── providers/
│   ├── __init__.py
│   ├── app_provider.py       # Scope.APP — singletons
│   ├── request_provider.py # Scope.REQUEST — per request
│   └── llm_provider.py    # LLM-specific
```

## Ошибки и решения

### "Cannot find dependency"

**Причина:** Provider не добавлен в контейнер.

**Решение:** Проверить `make_async_container()` содержит все providers.

### "Scope mismatch"

**Причина:** REQUEST пытается получить APP без FromDishka.

**Решение:**
```python
# Correct
def service(self, settings: AppSettings = FromDishka()):

# Wrong
def service(self, settings: AppSettings):  # Same scope required
```

### "Container already closed"

**Причина:** Использование после `await container.close()`.

**Решение:** Убедиться что container жив при использовании.

## Best Practices

### 1. AsyncContainer для FastAPI

```python
# Всегда используем AsyncContainer
container = make_async_container(providers...)
setup_dishka(container=container, app=app)
```

### 2. Explicit Scope

```python
# Явно указываем scope для каждого provider
class MyProvider(Provider):
    scope = Scope.APP  # или Scope.REQUEST
```

### 3. Clean shutdown

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    container = make_async_container(...)
    yield
    await container.close()  # CRITICAL
```

### 4. Группировка providers

```python
# Вместо одного большого Provider — несколько маленьких
container = make_async_container(
    DatabaseProvider(),
    LLMProvider(),
    NATSProvider(),
)
```

### 5. Testing

```python
# tests/conftest.py
import pytest
from dishka import make_async_container

@pytest.fixture
def container():
    container = make_async_container(
        MockAppProvider(),
        MockRequestProvider(),
    )
    yield container
    # Cleanup
```