# Module Structure Reference

This document provides the complete structure for all backend modules.

## Contacts Module ✅

```
src/contacts/
├── contacts.module.ts
├── contacts.service.ts
├── contacts.controller.ts
└── dto/
    ├── create-contact.dto.ts
    ├── update-contact.dto.ts
    ├── contact-filter.dto.ts
    └── contact-response.dto.ts
```

**Features:**
- ✅ CRUD operations
- ✅ Filters (search, companyName, tags, hasActiveDeals, hasClosedDeals)
- ✅ Statistics (activeDeals, closedDeals, totalDeals, totalDealVolume)
- ✅ Activity logging
- ✅ WebSocket events (contact.created, contact.updated, contact.deleted)

## Tasks Module (To Implement)

```
src/tasks/
├── tasks.module.ts
├── tasks.service.ts
├── tasks.controller.ts
└── dto/
    ├── create-task.dto.ts
    ├── update-task.dto.ts
    ├── task-filter.dto.ts
    └── task-response.dto.ts
```

**Required Features:**
- CRUD operations
- Linking to deals and contacts
- Status management (todo, in_progress, done, overdue)
- Views: List, Kanban, Calendar
- WebSocket events
- Activity logging

## Pipelines Module (To Implement)

```
src/pipelines/
├── pipelines.module.ts
├── pipelines.service.ts
├── pipelines.controller.ts
├── stages.service.ts
├── stages.controller.ts
└── dto/
    ├── create-pipeline.dto.ts
    ├── create-stage.dto.ts
    └── reorder-stages.dto.ts
```

**Required Features:**
- Pipeline CRUD
- Stage CRUD
- Drag & drop reordering
- Global vs per-pipeline stages

## Custom Fields Module (To Implement)

```
src/custom-fields/
├── custom-fields.module.ts
├── custom-fields.service.ts
├── custom-fields.controller.ts
└── dto/
    ├── create-custom-field.dto.ts
    ├── update-custom-field.dto.ts
    └── custom-field-value.dto.ts
```

**Required Features:**
- Field definitions
- Value storage
- Validation
- Per-pipeline field sets

## Comments Module (To Implement)

```
src/comments/
├── comments.module.ts
├── comments.service.ts
├── comments.controller.ts
└── dto/
    ├── create-comment.dto.ts
    └── comment-response.dto.ts
```

**Required Features:**
- CRUD operations
- Multi-entity support (deals, tasks, contacts)
- WebSocket events

## Files Module (To Implement)

```
src/files/
├── files.module.ts
├── files.service.ts
├── files.controller.ts
└── dto/
    ├── upload-file.dto.ts
    └── file-response.dto.ts
```

**Required Features:**
- Upload/download
- S3 integration (stub)
- Thumbnail generation
- Multi-entity support

## Import/Export Module (To Implement)

```
src/import-export/
├── import-export.module.ts
├── import.service.ts
├── export.service.ts
├── import.controller.ts
├── export.controller.ts
└── dto/
    ├── import-request.dto.ts
    └── export-request.dto.ts
```

**Required Features:**
- CSV/XLSX support
- Mapping UI
- Duplicate detection
- Job tracking

## Logging Module (To Implement)

```
src/logging/
├── logging.module.ts
├── logging.service.ts
└── dto/
    └── log-filter.dto.ts
```

**Required Features:**
- Error logging
- API call logging
- User action logging
- Querying and filtering

## Implementation Status

- ✅ Auth & Users
- ✅ Contacts Module
- ✅ Activity Module (basic)
- ✅ WebSocket Gateway (updated)
- ⏳ Tasks Module
- ⏳ Pipelines Module
- ⏳ Custom Fields Module
- ⏳ Comments Module
- ⏳ Files Module
- ⏳ Import/Export Module
- ⏳ Logging Module
- ⏳ Deals Module (needs update)

## Next Steps

1. Complete Tasks Module
2. Update Deals Module with Contacts integration
3. Implement Pipelines & Stages
4. Add Custom Fields support
5. Complete remaining modules
6. Write comprehensive tests
7. Update documentation





