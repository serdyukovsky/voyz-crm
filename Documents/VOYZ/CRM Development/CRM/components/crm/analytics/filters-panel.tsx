'use client'

import { Calendar, ChevronDown, Users, Tag, Filter } from 'lucide-react'
import { useState } from 'react'

export function FiltersPanel() {
  const [compareEnabled, setCompareEnabled] = useState(false)

  return (
    <div className="flex items-center gap-3 border-b border-border/50 bg-background px-6 py-3">
      {/* Date Range Picker */}
      <button className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Last 30 days</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Employee Filter */}
      <button className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span>All Employees</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Source Filter */}
      <button className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/5">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        <span>All Sources</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Stage Filter */}
      <button className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span>All Stages</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Compare Periods Toggle */}
      <button
        onClick={() => setCompareEnabled(!compareEnabled)}
        className={`ml-auto inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
          compareEnabled
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-border/50 bg-card text-foreground hover:bg-accent/5'
        }`}
      >
        Compare Periods
      </button>
    </div>
  )
}
