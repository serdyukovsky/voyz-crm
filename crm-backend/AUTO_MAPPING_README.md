# Auto-Mapping Service

Автоматическое сопоставление CSV колонок с полями CRM.

## API

### POST /api/import/auto-map

Автоматическое сопоставление CSV колонок с полями CRM.

**Query параметры:**
- `entityType` (required): `'contact' | 'deal'`

**Body:**
```json
{
  "columns": ["Email", "Phone", "Full Name", "Company"]
}
```

**Response:**
```json
[
  {
    "columnName": "Email",
    "suggestedField": "email",
    "confidence": 1.0
  },
  {
    "columnName": "Phone",
    "suggestedField": "phone",
    "confidence": 1.0
  },
  {
    "columnName": "Full Name",
    "suggestedField": "fullName",
    "confidence": 0.8
  },
  {
    "columnName": "Company",
    "suggestedField": "companyName",
    "confidence": 0.8
  }
]
```

## Алгоритм

1. **Нормализация колонок:**
   - lowercase
   - trim
   - remove symbols (_ - .)
   - remove spaces

2. **Matching с confidence scores:**
   - **exact match** → `confidence: 1.0`
   - **synonym match** → `confidence: 0.8`
   - **partial match** → `confidence: 0.6`
   - **unmapped** → `confidence: 0`

## Примеры

### Contacts
- `Email` → `email` (1.0)
- `E-Mail` → `email` (0.8)
- `Phone Number` → `phone` (0.6)
- `FIO` → `fullName` (0.8)
- `Organization` → `companyName` (0.8)

### Deals
- `Number` → `number` (1.0)
- `Deal Number` → `number` (0.6)
- `Amount` → `amount` (1.0)
- `Sum` → `amount` (0.8)
- `Expected Close Date` → `expectedCloseAt` (0.6)

## Использование

```typescript
import { AutoMappingService } from './auto-mapping.service';

const mappings = autoMappingService.autoMapColumns(
  ['Email', 'Phone', 'Full Name'],
  'contact'
);

// Результат:
// [
//   { columnName: 'Email', suggestedField: 'email', confidence: 1.0 },
//   { columnName: 'Phone', suggestedField: 'phone', confidence: 1.0 },
//   { columnName: 'Full Name', suggestedField: 'fullName', confidence: 0.8 }
// ]
```
