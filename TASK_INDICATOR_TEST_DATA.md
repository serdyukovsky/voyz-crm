# Task Indicator - Test Data

## How to Test the Task Indicator

The Task Indicator will automatically display based on the tasks data included in each deal. Here are test cases you can use to verify the implementation.

## Test Case 1: Active Task (Yellow Indicator)

Use this deal data in your API response:

```json
{
  "id": "deal-yellow",
  "title": "Website Redesign",
  "client": "Tech Startup",
  "amount": 15000,
  "stage": "in-progress",
  "stageId": "in-progress",
  "assignedTo": {
    "id": "user-1",
    "name": "John Smith",
    "avatar": "JS"
  },
  "updatedAt": "2026-01-22T10:00:00Z",
  "tasks": [
    {
      "id": "task-1",
      "status": "in_progress",
      "deadline": null
    }
  ]
}
```

**Expected Result:** Yellow dot (🟡) in bottom-right corner

---

## Test Case 2: Active Task with Future Deadline (Yellow Indicator)

```json
{
  "id": "deal-yellow-future",
  "title": "Mobile App Development",
  "client": "Enterprise Corp",
  "amount": 45000,
  "stage": "negotiation",
  "stageId": "negotiation",
  "assignedTo": {
    "id": "user-2",
    "name": "Sarah Lee",
    "avatar": "SL"
  },
  "updatedAt": "2026-01-22T11:00:00Z",
  "tasks": [
    {
      "id": "task-2",
      "status": "in_progress",
      "deadline": "2026-02-15"
    }
  ]
}
```

**Expected Result:** Yellow dot (🟡) in bottom-right corner

---

## Test Case 3: Overdue Task - 5 Days (Red Indicator with Counter)

```json
{
  "id": "deal-overdue-5",
  "title": "Integration Services",
  "client": "Financial Group",
  "amount": 28000,
  "stage": "new",
  "stageId": "new",
  "assignedTo": {
    "id": "user-3",
    "name": "Mike Chen",
    "avatar": "MC"
  },
  "updatedAt": "2026-01-22T12:00:00Z",
  "tasks": [
    {
      "id": "task-3",
      "status": "in_progress",
      "deadline": "2026-01-17"
    }
  ]
}
```

**Expected Result:** Red dot (🔴) + "5 дн." text

---

## Test Case 4: Multiple Tasks with One Overdue (Shows Max Days)

```json
{
  "id": "deal-multiple",
  "title": "Consulting Project",
  "client": "Healthcare Provider",
  "amount": 52000,
  "stage": "closed-won",
  "stageId": "closed-won",
  "assignedTo": {
    "id": "user-4",
    "name": "Emma Wilson",
    "avatar": "EW"
  },
  "updatedAt": "2026-01-22T13:00:00Z",
  "tasks": [
    {
      "id": "task-4",
      "status": "completed",
      "deadline": "2026-01-20"
    },
    {
      "id": "task-5",
      "status": "in_progress",
      "deadline": "2026-01-15"
    },
    {
      "id": "task-6",
      "status": "pending",
      "deadline": "2026-01-18"
    }
  ]
}
```

**Expected Result:** Red dot (🔴) + "7 дн." text (max of 7 days overdue for task-5)

---

## Test Case 5: No Active Tasks (Hidden Indicator)

```json
{
  "id": "deal-no-tasks",
  "title": "Support Package",
  "client": "DataCo Analytics",
  "amount": 8500,
  "stage": "in-progress",
  "stageId": "in-progress",
  "assignedTo": {
    "id": "user-5",
    "name": "Alex Turner",
    "avatar": "AT"
  },
  "updatedAt": "2026-01-22T14:00:00Z",
  "tasks": []
}
```

**Expected Result:** No indicator displayed (TaskIndicator returns null)

---

## Test Case 6: Only Completed Tasks (Hidden Indicator)

```json
{
  "id": "deal-completed",
  "title": "Team Plan Upgrade",
  "client": "DesignHub Studio",
  "amount": 15000,
  "stage": "negotiation",
  "stageId": "negotiation",
  "assignedTo": {
    "id": "user-6",
    "name": "Chris Park",
    "avatar": "CP"
  },
  "updatedAt": "2026-01-22T15:00:00Z",
  "tasks": [
    {
      "id": "task-7",
      "status": "completed",
      "deadline": "2026-01-15"
    },
    {
      "id": "task-8",
      "status": "done",
      "deadline": "2026-01-16"
    }
  ]
}
```

**Expected Result:** No indicator displayed (all tasks are completed)

---

## Test Case 7: No Tasks Field (Hidden Indicator)

```json
{
  "id": "deal-undefined",
  "title": "License Agreement",
  "client": "Acme Corp",
  "amount": 45000,
  "stage": "new",
  "stageId": "new",
  "assignedTo": {
    "id": "user-7",
    "name": "David Kim",
    "avatar": "DK"
  },
  "updatedAt": "2026-01-22T16:00:00Z"
  // No tasks field at all
}
```

**Expected Result:** No indicator displayed (tasks is undefined)

---

## Visual Comparison

| Test Case | Yellow (🟡) | Red (🔴) | "X дн." | Expected |
|-----------|:-:|:-:|:-:|:--|
| 1. Active (null deadline) | ✅ | ❌ | ❌ | Yellow dot |
| 2. Active (future deadline) | ✅ | ❌ | ❌ | Yellow dot |
| 3. Overdue (5 days) | ❌ | ✅ | ✅ | Red dot + "5 дн." |
| 4. Multiple (max 7 days) | ❌ | ✅ | ✅ | Red dot + "7 дн." |
| 5. No tasks | ❌ | ❌ | ❌ | Hidden |
| 6. Only completed | ❌ | ❌ | ❌ | Hidden |
| 7. Undefined tasks | ❌ | ❌ | ❌ | Hidden |

---

## How to Test in Development

1. Open your browser to `http://localhost:5173`
2. Navigate to the deals kanban view
3. Modify the deal data in your API to include the test cases above
4. The indicators should appear/update automatically

## Debugging

If indicators don't appear:

1. ✅ Check that `deal.tasks` is populated with data
2. ✅ Verify that `task.status` is one of: `in_progress`, `pending`, etc. (NOT `completed` or `done`)
3. ✅ Check browser console for errors
4. ✅ Clear browser cache (hard refresh)
5. ✅ Verify component is imported correctly in deal-card.tsx

## Notes

- Task deadline should be ISO 8601 date format (e.g., "2026-01-17")
- Overdue calculation is based on 00:00 of the current day
- Multiple overdue tasks show the maximum number of days overdue
- Component is fully optimized with React.memo
