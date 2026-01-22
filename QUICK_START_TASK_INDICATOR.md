# Quick Start: Task Indicator

## What's New?

Deal cards in kanban now show task status indicators in the bottom-right corner:
- 🟡 **Yellow dot** = Active task (not overdue)
- 🔴 **Red dot + "X дн."** = Task is overdue by X days

## Files

| File | Status |
|------|--------|
| `components/crm/task-indicator.tsx` | ✨ NEW |
| `components/crm/deal-card.tsx` | 📝 UPDATED |
| `components/crm/kanban-board.tsx` | 📝 UPDATED |

## Example Deal with Tasks

```typescript
const deal = {
  id: "deal-1",
  title: "Enterprise Deal",
  client: "Acme Corp",
  amount: 45000,
  stage: "new",
  assignedTo: { name: "John Smith", avatar: "JS" },
  updatedAt: "2024-01-15T10:30:00Z",
  tasks: [
    {
      id: "task-1",
      status: "in_progress",
      deadline: "2026-01-17"  // 5 days overdue!
    }
  ]
}
```

Result:
```
┌────────────────────────────┐
│ Enterprise Deal            │
│ Acme Corp                  │
│ $45,000                    │
│ [New]                      │
├────────────────────────────┤
│ [JS] John      5h ago      │
│           5 дн. 🔴        │
└────────────────────────────┘
```

## How It Works

**TaskIndicator automatically:**
1. ✅ Hides if no active tasks
2. ✅ Shows yellow dot for active tasks
3. ✅ Shows red dot + days for overdue tasks
4. ✅ Ignores completed tasks
5. ✅ Shows max overdue days if multiple overdue tasks

## Integration

No additional setup required! Just ensure your Deal API response includes:

```json
{
  "id": "...",
  "title": "...",
  "tasks": [
    {
      "id": "task-id",
      "status": "in_progress",  // or "pending", "completed", etc.
      "deadline": "2026-01-17"   // ISO date string or null
    }
  ]
}
```

## Status Support

Tasks are considered **active** if status is NOT:
- `completed`
- `done`

All other statuses (pending, in_progress, etc.) are active.

## Performance

✅ Optimized with React.memo
✅ Only re-renders when task data changes
✅ No additional API calls
✅ Works with WebSocket updates

---

Full documentation: `TASK_INDICATOR_IMPLEMENTATION.md`
