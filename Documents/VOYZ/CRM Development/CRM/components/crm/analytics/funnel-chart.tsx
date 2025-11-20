'use client'

import { ArrowRight } from 'lucide-react'

const stages = [
  { name: 'New', count: 247, conversion: 68, avgTime: '2.3d' },
  { name: 'Qualified', count: 168, conversion: 71, avgTime: '3.8d' },
  { name: 'Proposal', count: 119, conversion: 58, avgTime: '5.2d' },
  { name: 'Negotiation', count: 69, conversion: 75, avgTime: '4.1d' },
  { name: 'Closed Won', count: 52, conversion: 100, avgTime: '1.2d' },
]

export function FunnelChart() {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-6">
      <h3 className="mb-6 text-sm font-semibold text-foreground">Deal Funnel</h3>
      <div className="flex items-center gap-4">
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex flex-1 items-center gap-4">
            <div className="flex-1">
              <div className="rounded-md border border-border/50 bg-background p-4">
                <div className="text-xs font-medium text-muted-foreground">{stage.name}</div>
                <div className="mt-2 text-xl font-semibold text-foreground">{stage.count}</div>
                <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Conversion</span>
                    <span className="font-medium text-foreground">{stage.conversion}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Avg Time</span>
                    <span className="font-medium text-foreground">{stage.avgTime}</span>
                  </div>
                </div>
              </div>
            </div>
            {index < stages.length - 1 && (
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
