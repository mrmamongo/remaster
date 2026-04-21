# Domain: Core - Groups

## Overview

Group management domain с иерархической структурой до 5 уровней в depth.

## Entities

```mermaid
classDiagram
    class Group {
        UUID id
        string name
        UUID parent_id
        string path
        int depth
        datetime created_at
        dict metadata
    }

    class GroupMembership {
        UUID id
        UUID group_id
        UUID user_id
        string role
        datetime joined_at
    }

    class GroupPath {
        string path
        UUID group_id
        int depth
    }

    Group "1" --* "0..1" Group : parent
    Group "1" --> "*" GroupMembership
    Group --> GroupPath
```

## Hierarchy Example

```mermaid
graph TB
    subgraph COMPANY["company/"]
        C[company]
    end

    subgraph DEPARTMENTS["departments/"]
        E[engineering]
        M[marketing]
        S[sales]
    end

    subgraph TEAMS["teams/"]
        EP[platform]
        EB[backend]
        MC[content]
        SE[enterprise]
    end

    C --> E
    C --> M
    C --> S
    E --> EP
    E --> EB
    M --> MC
    S --> SE
```

## Validation Rules

- Max depth: 5 levels
- Path format: `/company/department/team/...`
- Unique name at sibling level
- Circular references prohibited

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/groups | List groups |
| POST | /api/groups | Create group |
| GET | /api/groups/{id} | Get group |
| PATCH | /api/groups/{id} | Update group |
| DELETE | /api/groups/{id} | Delete group |
| GET | /api/groups/{id}/members | List members |
| POST | /api/groups/{id}/members | Add member |
| DELETE | /api/groups/{id}/members/{user_id} | Remove member |