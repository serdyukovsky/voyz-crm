# How to Test Task Indicator Implementation

## ✅ Prerequisites

- Backend running on http://localhost:3000 (or configured port)
- Frontend running on http://localhost:5173
- Deals kanban view accessible

## 🚀 Step-by-Step Testing

### Step 1: Open the Deals Kanban View

1. Go to http://localhost:5173 in your browser
2. Navigate to the Deals section
3. Switch to Kanban view (if not already there)

### Step 2: Test Yellow Indicator (Active Task)

Expected: Yellow dot (🟡) appears in the bottom-right corner of a deal card

**What to look for:**
- Small yellow circle with slight shadow
- Appears next to the "updated time" in the footer
- No text displayed

**How to trigger:**
```typescript
// Make sure a deal has tasks with active status
{
  "tasks": [
    {
      "id": "task-1",
      "status": "in_progress",    // Active status
      "deadline": null             // No deadline or future date
    }
  ]
}
```

### Step 3: Test Red Indicator (Overdue Task)

Expected: Red dot (🔴) + days counter (e.g., "5 дн.") appears

**What to look for:**
- Red circle with shadow
- Text "X дн." appears to the left of the circle
- Example: "5 дн. 🔴"

**How to trigger:**
```typescript
{
  "tasks": [
    {
      "id": "task-1",
      "status": "in_progress",
      "deadline": "2026-01-17"    // Date in the past (5+ days ago)
    }
  ]
}
```

### Step 4: Test Hidden Indicator (No Active Tasks)

Expected: No indicator appears at all

**What to look for:**
- No yellow or red dots
- Card displays normally without any task indicator

**How to trigger:**
```typescript
// Case 1: No tasks
{
  "tasks": []
}

// Case 2: Only completed tasks
{
  "tasks": [
    {
      "id": "task-1",
      "status": "completed",    // Inactive status
      "deadline": "2026-01-17"
    }
  ]
}

// Case 3: No tasks field
{
  // tasks property is completely absent
}
```

### Step 5: Test Multiple Overdue Tasks

Expected: Red indicator shows the maximum overdue days

**What to look for:**
- Red dot appears
- Shows the largest number of days
- Example: If one task is 5 days late and another is 7 days late, shows "7 дн."

**How to trigger:**
```typescript
{
  "tasks": [
    {
      "id": "task-1",
      "status": "completed",
      "deadline": "2026-01-20"    // Completed, ignored
    },
    {
      "id": "task-2",
      "status": "in_progress",
      "deadline": "2026-01-17"    // 5 days overdue
    },
    {
      "id": "task-3",
      "status": "pending",
      "deadline": "2026-01-15"    // 7 days overdue (SHOWN)
    }
  ]
}
```

## 🎯 Visual Checklist

- [ ] Yellow dot appears for active tasks without overdue dates
- [ ] Yellow dot appears for active tasks with future dates
- [ ] Red dot appears for overdue tasks
- [ ] Days counter (e.g., "5 дн.") displays correctly for overdue
- [ ] No indicator shown for completed tasks
- [ ] No indicator shown when no active tasks exist
- [ ] Indicators position correctly in card footer (bottom-right)
- [ ] Indicators scale with different card sizes
- [ ] Hover tooltip works (shows task information)

## 🔧 Debugging Tips

### If indicators don't appear:

1. **Check API Response**
   ```bash
   # Inspect the network request for deals
   # Should include tasks array in response
   ```

2. **Verify Component is Loaded**
   - Open browser DevTools (F12)
   - Go to Elements/Inspector tab
   - Search for "TaskIndicator"
   - Should find the component in the DOM

3. **Check Browser Console**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for any error messages
   - Check for "TaskIndicator is not defined" errors

4. **Verify Import**
   - Open `/components/crm/deal-card.tsx`
   - Check line 7 has: `import { TaskIndicator } from "./task-indicator"`

5. **Check File Exists**
   ```bash
   ls -la components/crm/task-indicator.tsx
   ```

### If colors are wrong:

- Yellow should be: `#FBBF24` (bg-yellow-400)
- Red should be: `#EF4444` (bg-red-500)

### If text doesn't show:

- Check date format is ISO 8601 (e.g., "2026-01-17")
- Verify overdue calculation (should be current date > deadline date)
- Days should display as "X дн." (with Russian abbreviation)

## 📝 Test Data

See [TASK_INDICATOR_TEST_DATA.md](TASK_INDICATOR_TEST_DATA.md) for complete test cases with JSON examples.

## ✨ Expected Behavior

| Scenario | Yellow (🟡) | Red (🔴) | Days | Hidden |
|----------|:--:|:--:|:--:|:--:|
| Active, no deadline | ✅ | ❌ | ❌ | ❌ |
| Active, future date | ✅ | ❌ | ❌ | ❌ |
| Overdue | ❌ | ✅ | ✅ | ❌ |
| Completed only | ❌ | ❌ | ❌ | ✅ |
| No tasks | ❌ | ❌ | ❌ | ✅ |

## 🎉 Success Criteria

All of the following should be true:

- ✅ Component renders without errors
- ✅ Yellow indicator shows for active tasks
- ✅ Red indicator shows for overdue tasks
- ✅ Days counter displays correctly
- ✅ No indicator for completed/inactive tasks
- ✅ Responsive on all screen sizes
- ✅ Performance is smooth (no lag)
- ✅ Tooltip shows on hover
