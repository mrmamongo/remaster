# Domain: Core - Rate Limits

## Overview

Rate limiting system для пользователей, групп, API ключей и моделей.

## Entities

```mermaid
classDiagram
    class RateLimit {
        UUID id
        RateLimitScope scope
        string scope_id
        int rpm
        int tpm_daily
        int budget_monthly
        dict metadata
    }

    class RateLimitTier {
        string name
        int rpm
        int tpm_daily
        int budget_monthly
    }

    class RateLimitUsage {
        UUID id
        UUID rate_limit_id
        int requests_count
        int tokens_count
        float cost_cents
        date usage_date
    }

    RateLimit "1" --> "*" RateLimitUsage
    RateLimit --> RateLimitTier
```

## Scope Types

```mermaid
graph LR
    subgraph SCOPES["Rate Limit Scopes"]
        U[user]
        G[group]
        K[api_key]
        M[model]
    end
```

## Tier Configuration

```mermaid
graph LR
    subgraph TIERS["Rate Limit Tiers"]
        F[Free]
        P[Pro]
        T[Team]
        E[Enterprise]
    end

    F -- "10 RPM" --> P
    P -- "100 RPM" --> T
    T -- "500 RPM" --> E
```

## Limit Hierarchy

```mermaid
flowchart TB
    R[Request] --> C{Check Limits}
    
    C --> U[User Limit]
    C --> G[Group Limit]
    C --> K[API Key Limit]
    C --> M[Model Limit]
    
    U --> UO[User Limit Reached?]
    G --> GO[Group Limit Reached?]
    K --> KO[API Key Limit Reached?]
    M --> MO[Model Limit Reached?]
    
    UO -->|Yes| R1[Reject 429]
    GO -->|Yes| R2[Reject 429]
    KO -->|Yes| R3[Reject 429]
    MO -->|Yes| R4[Reject 429]
    
    UO -->|No| P[Proceed]
    GO -->|No| P
    KO -->|No| P
    MO -->|No| P
```

## Counter Implementation

```mermaid
sequenceDiagram
    participant R as Request
    participant S as Service
    participant Re as Redis
    participant L as Logger

    R->>S: API Request
    S->>Re: INCR user:123:rpm
    S->>Re: INCR user:123:tokens:day
    S->>Re: INCR model:llama:tokens:day
    
    alt Within limits
        S->>R: 200 OK
    else Over limits
        S->>R: 429 Too Many Requests
    end
    
    S->>L: Log usage
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/rate-limits | Get my rate limits |
| POST | /api/rate-limits | Set rate limit (admin) |
| GET | /api/rate-limits/usage | Get usage stats |
| POST | /api/rate-limits/reset | Reset limits (admin) |

### Redis Keys Pattern

```
# RPM (sliding window)
ratelimit:user:{user_id}:rpm:{minute}

# TPM Daily
ratelimit:user:{user_id}:tokens:{date}

# Budget Monthly
ratelimit:user:{user_id}:budget:{year_month}
```