# Critical Questions & Implementation Concerns

> Критический обзор по всем доменам — вопросы, которые встанут при реализации.

---

## 1. Users + Kratos Integration

### Q: CLI / Desktop Client Authentication

- OIDC flow для нативных приложений?
- PAT как fallback?
- Token refresh handling?

**Resolution:** Hydra OIDC for all clients (CLI, Desktop, Web).

### Q: Как синхронизировать Kratos identity с локальной таблицей users?

**Options:**
1. Webhook от Kratos при создании/удалении identity
2. Polling / sync on login
3. Ory Keto для permissions + Kratos для identity = двойная работа

**Risk:** Дублирование данных, рассинхрон при webhook failure.

**Resolution:** Webhook от Kratos → sync users, fallback sync on login.

### Q: Что делать при hard delete в Kratos?

- Soft delete в нашей БД?
- cascade delete всех связанных сущностей (chats, KBs)?

**Resolution:** Soft delete + cascade для связанных сущностей.

### Q: Session management — кто делает?

- Kratos handle session (refresh, logout)
- Наша система только получает user_id

**Resolution:** Kratos полностью. Oathkeeper прокидывает X-User-ID header.

### Q: user metadata — где хранить?

- В Kratos identity metadata JSON?
- Или в локальной таблице user_settings?

**Resolution:** 
- Auth metadata (roles, groups) → Kratos
- User preferences, settings → local `user_settings` table

---

## 2. Groups (Ory Keto)

### Q: Иерархия 5 уровней — запросы в Keto?

- `ExpandAPI` — медленно для deep hierarchy
- Кэшировать expand results?
- Инвалидация при изменении группы

**Resolution:** Defer optimization. 5 levels with small groups is acceptable.

### Q: Writing permissions в Keto — медленный

- Прямой write в Keto на каждый request?
- Batch writes?
- Кэш на чтение?

**Resolution:** Batch writes where applicable.

### Q: Как мержить inherited permissions?

- User → parent groups → ancestor groups
- Keto expand возвращает всё, но медленно
- Нужен intermediate cache layer

**Resolution:** Keto expand handles it natively.

### Q: Nested groups — performance

- 1000 users в группе depth 5
- Сколько времени expand?
- Нужен pagination?

**Resolution:** Pagination is implementation detail.

---

## 3. Permissions (ReBAC)

### Q: Когда делать permission check?

- **On read:** всегда актуально, но медленно
- **On write:** кэшируем, инвалидируем при изменении
- **Hybrid:** check on read, cache результат на N минут

**Resolution:** Check on every request — Keto is fast enough (P99 < 1ms @ 50M tuples).

### Q: Permission cache — где?

- Redis? In-memory?
- TTL — какой?
- Инвалидация — как?

**Resolution:** NO CACHE — Ory Keto provides strong consistency with in-memory optimization. No external cache layer needed.

### Q: Bulk permissions — как проверять?

- User имеет доступ к 100+ resources
- N+1 запросов в Keto?
- Batch check API в Keto?

**Resolution:** Use batch check API when available, otherwise parallelize with asyncio.

---

## 4. Rate Limits

### Q: Distributed rate limiting — как?

- Все ноды пишут в один Redis
- Sliding window — точный подсчёт?
- Или token bucket?

**Resolution:** Sliding window, Redis as single source of truth.

### Q: Budget (tokens, $) — как трекать?

- После каждого запроса — round trip в Redis
- Асинхронный incr?
- eventual consistency?

**Resolution:** Sync incr per request — consistency over latency.

### Q: Rate limit per group — наследование?

- User member of group с лимитом 1000 RPM
- Own лимит 100 RPM — какой приоритет?
- Max of user и group?

**Resolution:** max(user_limit, group_limit).

### Q: Борьба с burst — как?

- Token bucket с burst capacity
- Или queue с backpressure?

**Resolution:** Queue with backpressure.

---

## 5. Chat + AG-UI

### Q: AG-UIv1 compliance — полная?

- Vendor extensions — как обрабатывать?
- Backward compatibility при обновлении spec

**Resolution:** Full v1 compliance.

### Q: SSE — как восстанавливаться?

- Reconnect после disconnect
- Как не потерять контекст?
- Cursor-based resumption?

**Resolution:** SSE + cursor-based resumption.

### Q: История сообщений — где?

- Postgres full-text search
- Chat history в отдельной таблице
- Pagination — offset или cursor?

**Resolution:** Postgres, cursor pagination.

### Q: Tool calls в message — как хранить?

- JSON в message.content
- Отдельная таблица tool_invocations?

**Resolution:** JSON in message.content (jsonb).

### Q: Streaming — как детектить ошибки?

- SSE + error event
- Retry на клиенте

**Resolution:** SSE error events + client retry.

---

## 6. Agents (ReAct Loop)

### Q: ReAct loop — как ограничить итерации?

- Max turns — 10? 20? Конфигурируемо?
- Что делать при достижении лимита?

**Resolution:** Configurable max_turns. Cut off when limit reached.

### Q: Tool execution timeout — как?

- Долгий tool (MCP server slow response)
- Timeout — как обрабатывать?
- Force kill?

**Resolution:** Timeout with error message. Never leave user request hanging.

### Q: Tool result → LLM — асинхронно?

- Tool выполнился, result идёт в LLM
- Stream прерывается — как?
- Queue tool results?

**Resolution:** Queue tool results, continue stream.

### Q: State machine — сложное

- pending → running → waiting HITL → paused → completed/failed
- State persistence — где?

**Resolution:** Temporal handles state machine + persistence.

### Q: Агент принадлежит юзеру или платформе?

- User-created agent
- Platform pre-defined agent
- Group agent

**Resolution:** All three types — user, platform, group agents.

### Q: Streaming SSE — как передавать intermediate steps?

- `tool_call` event
- `tool_result` event
- `thought` event

**Resolution:** Per AG-UI streaming protocol.

### Q: Tracing — полный?

- Langfuse / OpenTelemetry
- Вложенные spans для tool execution
- Cost tracking per step

**Resolution:** Langfuse SDK → Victoria Traces (OpenTelemetry exporter).

---

## 7. Knowledge Base (RAG)

### Q: Embedding model —哪家?

- Cloud (OpenAI, Cohere)
- Local (модель на CPU/GPU)
- Fallback если unavailable?

**Resolution:** Modality field on model: `EmbeddingsDense`, `EmbeddingsSparse`, `EmbeddingsRerank`, plus custom (e.g., OCR).

### Q: Vector DB — какая?

- pgvector (Postgres extension)
- Qdrant
- Milvus
- Cloud (Pinecone)

**Resolution:** Qdrant.

### Q: Chunking — edge cases

- PDF с изображениями — как?
- Таблицы — сохранять структуру?
- Код с indentation — сохранять?

**Resolution:** PDF+images → OCR model with custom modality. Keep for later.

### Q: CSV/Excel chunking

- Encoding — UTF-8, cp1251?
- Large files (100MB) — streaming?
- Column selection — валидация что колонка есть

**Resolution:** UTF-8, streaming for large, validate columns.

### Q: Parent-child — storage

- Parent chunks не в vector DB
- Link parent → children — как?
- При search — JOIN parent

**Resolution:** Parent chunks in Postgres, link via metadata field. JOIN on search.

### Q: Re-ranking — когда?

- Всегда rerank?
- Если top-k small (10-20)?
- Batching rerank requests?

**Resolution:** Rerank if configured in KB or request. Load top_n × 2, keep top_n.

### Q: Search — hybrid

- Vector similarity + BM25
- Weighted combination
- Как подбирать weight?

**Resolution:** Hybrid only through rerank for now.

### Q: Cost — embedding storage

- Dense vectors (1536 dim) × chunk_count
- Disk usage — мониторинг
- Quantization?

**Resolution:** Monitor disk, consider quantization later.

### Q: Deletion — cascade?

- Delete KB → delete all chunks
- Async — не блокировать API

**Resolution:** Async delete.

---

## 8. MCP Gateway

### Q: MCP Protocol — какой версии?

- JSON-RPC 2.0 compatibility
- Full spec support?

**Resolution:** Full latest spec.

### Q: MCP Authentication — OAuth?

- OAuth 2.0 для аутентификации MCP клиентов?
- Какие grant types?
- Token refresh?

**Resolution:** OAuth 2.0 — authorization_code + client_credentials для machine-to-machine.

### Q: Connection management

- Long-lived connections — как держать?
- Health check — ping/pong interval
- Reconnect при disconnect

**Resolution:** Native SSE/connection management. Keep connections in monolith.

### Q: Tool execution security

- MCP server может exec arbitrary code
- Sandboxing?
- Timeout на exec?

**Resolution:** MCP servers CANNOT exec arbitrary code. Clarified — no sandbox needed.

### Q: Tool permissions — check performance

- Каждый tool call → permission check
- Batch check?
- Cached permissions per session

**Resolution:** Check on every call. No caching.

### Q: MCP server inside sandbox?

- Docker container
- Network isolation
- ресурсы (CPU, memory)

**Resolution:** No sandbox. MCP gateway in monolith.

### Q: Как обрабатывать MCP server errors?

- Invalid input schema
- Server timeout
- Connection lost

**Resolution:** Per MCP protocol error handling.

### Q: Tool caching

- Tools не меняются часто
- Cache tools list
- Invalidate on reconnect

**Resolution:** NO CACHE at all.

---

## 9. HITL (Human-in-the-Loop)

### Q: Blocking execution

- Agent awaiting HITL — как не блокировать?
- Background job?
- Timeout — что делать?

**Resolution:** Temporal pause/resume. Stop agent, wait, continue with new messages.

### Q: HITL timeout

- Человек не отвечает — 1 час? 1 день?
- Auto-reject?
- Escalation?

**Resolution:** Timeout + auto-reject. Escalation later.

### Q: Nested HITL

- Agent pause → human responds
- Agent continues → another HITL
- Stack depth — unlimited?

**Resolution:** Single level for now.

### Q: Custom widgets — как рендерить?

- JSON Schema → Frontend component
- Who defines widgets?
- Widget registry?

**Resolution:** Custom widgets defined per tool. Widget registry by tool ID.

### Q: HITL в чате vs agentic

- Чат: inline approvals in message payload
- Agentic: pause/resume endpoints
- Унифицировать?

**Resolution:** Chat — inline, agentic — execution logs page.

### Q: Notifications

- WebSocket push
- Email
- Mobile push

**Resolution:** Email for now.

### Q: Audit log

- Кто, когда, что утвердил
- Полная трассировка

**Resolution:** Full audit trail.

---

## 10. LLM Engine + Model Gateway

### Q: Model routing — критерии

- By capability (chat, embedding, vision)
- By availability
- By cost
- Fallback order

**Resolution:** By capability → availability → cost. Fallback chain.

### Q: Cloud models — API key security

- Encrypted storage
- Audit log usage
- Rate limiting per model

**Resolution:** Encrypted storage (Infisical), audit log, rate limit per model.

### Q: Local models (SGLang/vLLM)

- Auto-provisioning — как?
- Kubernetes / Docker Compose
- GPU scheduling

**Resolution:** Auto-provision via click. Kubernetes/Docker Compose.

### Q: Streaming — как проксировать?

- SSE от external API → SSE to client
- Buffering — проблема latency
- Как handle partial responses?

**Resolution:** Direct proxy streaming.

### Q: Cost tracking — точность

- Token counting — от модели или посчитать?
- Different models — разные цены
- Monthly budget

**Resolution:** Token count from model response. Different prices per model.

### Q: Retry / Circuit breaker

- Model down — fallback
- Retry with backoff
- Circuit breaker для зависших запросов

**Resolution:** Client-side retry. Circuit breaker at gateway.

### Q: OpenAI compatible API

- Все фичи OpenAI
- Tool calling — поддержка
- Vision — поддержка

**Resolution:** Full feature support.

### Q: Anthropic API

- Messages API
- Vision
- Streaming

**Resolution:** Full feature support.

### Q: Dashboard metrics

- Real-time vs aggregated
- Задержка — 1 min / 5 min
- Retention — 30 days?

**Resolution:** 1 min delay, 30 days retention.

---

## 11. Cross-cutting Concerns

### Q: Observability stack

- Victoria Metrics / Prometheus
- Grafana
- Jaeger / Tempo
- Alertmanager

**Resolution:** Victoria Metrics + Grafana + Tempo + Alertmanager (Victoria stack).

### Q: Health checks

- Liveness / Readiness
- Deep vs shallow checks

**Resolution:** Liveness + Readiness probes.

### Q: Configuration — где?

- Env variables
- Config file
- Database config

**Resolution:** Env vars via Infisical + DB for user configs.

### Q: Feature flags

- Как включать/выключать фичи
- Per-user / per-group

**Resolution:** Skip for now — too complex.

### Q: Audit log — что логируем?

- All permission changes
- All data modifications
- All API calls?

**Resolution:** Everything except model requests.

### Q: Migration strategy

- Zero-downtime migrations
- Rollback strategy
- Schema versioning

**Resolution:** Out of scope for this doc.

### Q: Testing

- Unit tests
- Integration tests
- E2E tests
- Load tests

**Resolution:** E2E + Integration tests.

---

## 12. Additional Components

### Q: NATS — JetStream for persistence?

- Do we need message persistence?
- At-least-once delivery?
- Message replay?

**Resolution:** JetStream when needed. Current priority — no persistence needed yet.

### Q: File Storage

- Where to store uploaded files?
- S3 / MinIO?
- Large file handling?

**Resolution:** S3. Dev — MinIO, Prod — cloud S3 cluster.

### Q: Redis — do we need it?

- Cache layer?
- Rate limiting?
- Session store?

**Resolution:** Redis only for rate limiting (not permissions). Everything else — skip.

### Q: Chat History Search

- Full-text search in Postgres?
- Elasticsearch?
- pg_trgm?

**Resolution:** pg_trgm for now. Scale later.

### Q: Webhooks

- Outgoing webhooks for external integrations?
- Event-driven architecture?

**Resolution:** Future feature. Not in scope now.

### Q: Scheduler

- Periodic tasks (cleanup, reports)?
- Temporal for everything?
- Cron?

**Resolution:** Temporal handles all scheduling (including periodic workflows).

### Q: Backup Strategy

- PostgreSQL backups?
- Qdrant snapshots?
- RTO/RPO targets?

**Resolution:** Deployment checklist will include backup strategy.

---

## Summary — Resolved

| Domain | Decision |
|--------|----------|
| Users | Soft delete, Kratos + Hydra OIDC, X-User-ID, auth meta in Kratos, prefs in local |
| Groups | No optimization needed, batch writes, Keto native expand |
| Permissions | Check every request, no cache, batch where available |
| Rate Limits | Sliding window, Redis, sync, max(user, group), queue |
| Chat | AG-UI full, SSE + cursor, jsonb, error events |
| Agents | Configurable max_turns, timeout, Temporal state, Langfuse → Victoria |
| Knowledge | Qdrant, modality types, parent in Postgres, async delete |
| MCP | Full spec, OAuth2 (auth_code + client_credentials), no sandbox, no cache |
| HITL | Temporal pause/resume, single level, email, audit |
| LLM Engine | Routing, OpenAI/Anthropic full, 1min/30days |
| Cross-cutting | Victoria stack, Infisical, audit all except model |
| Additional | JetStream later, S3 (MinIO dev/prod cloud), Redis only rate limits, pg_trgm, Temporal scheduler |