"use client"

import { Deal, Stage } from "./kanban-board"
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from "date-fns"
import { Trash2, MoveRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface DealsListViewProps {
  deals: Deal[]
  selectedDeals?: string[]
  onSelectDeals?: (ids: string[]) => void
  onBulkDelete?: () => void
  onBulkChangeStage?: (stage: string) => void
  stages?: Stage[]
}

export function DealsListView({ 
  deals, 
  selectedDeals = [], 
  onSelectDeals,
  onBulkDelete,
  onBulkChangeStage,
  stages = []
}: DealsListViewProps) {
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  const handleSelectAll = (checked: boolean) => {
    if (onSelectDeals) {
      onSelectDeals(checked ? deals.map(d => d.id) : [])
    }
  }

  const handleSelectDeal = (dealId: string, checked: boolean) => {
    if (onSelectDeals) {
      onSelectDeals(
        checked
          ? [...selectedDeals, dealId]
          : selectedDeals.filter(id => id !== dealId)
      )
    }
  }

  const allSelected = deals.length > 0 && selectedDeals.length === deals.length
  const someSelected = selectedDeals.length > 0 && selectedDeals.length < deals.length

  return (
    <div>
      {selectedDeals.length > 0 && (
        <div className="mb-4 p-3 bg-surface border border-border/40 rounded-lg flex items-center justify-between">
          <span className="text-sm text-foreground">
            {selectedDeals.length} {selectedDeals.length === 1 ? 'deal' : 'deals'} selected
          </span>
          <div className="flex gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
              >
                <MoveRight className="mr-2 h-4 w-4" />
                Change Stage
              </Button>
              {isStageDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsStageDropdownOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-border/40 rounded-lg shadow-lg z-20 overflow-hidden">
                    {stages.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => {
                          if (onBulkChangeStage) onBulkChangeStage(stage.id)
                          setIsStageDropdownOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface/50 transition-colors"
                      >
                        {stage.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkDelete}
              className="text-red-500 hover:text-red-600 hover:border-red-500/50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border/40 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40 bg-surface/30">
              <th className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-border/40 bg-background text-primary focus:ring-2 focus:ring-primary/20"
                  aria-label="Select all deals"
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Client</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Stage</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Assigned</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr
                key={deal.id}
                className="border-b border-border/40 hover:bg-surface/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedDeals.includes(deal.id)}
                    onChange={(e) => handleSelectDeal(deal.id, e.target.checked)}
                    className="w-4 h-4 rounded border-border/40 bg-background text-primary focus:ring-2 focus:ring-primary/20"
                    aria-label={`Select ${deal.title}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/deals/${deal.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {deal.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{deal.client}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {formatCurrency(deal.amount)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-border/40 text-muted-foreground">
                    {deal.stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {deal.assignedTo.avatar}
                    </div>
                    <span className="text-sm text-muted-foreground">{deal.assignedTo.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(deal.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
