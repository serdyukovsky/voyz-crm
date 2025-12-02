"use client"

import { Deal, Stage } from "./kanban-board"
import { formatDistanceToNow } from "date-fns"
import { Trash2, MoveRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useState, useRef } from "react"
import { useTranslation } from '@/lib/i18n/i18n-context'
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { DealDetail } from './deal-detail'

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
  const { t } = useTranslation()
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const scrollPositionRef = useRef<number>(0)

  // Helper function to get stage info by ID
  const getStageInfo = (stageId: string): { name: string; color: string } => {
    const stage = stages.find(s => s.id === stageId)
    if (stage) {
      return {
        name: stage.label || stage.name || stageId,
        color: stage.color || '#6B7280'
      }
    }
    return {
      name: stageId,
      color: '#6B7280'
    }
  }

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

  const handleDealClick = (dealId: string, e: React.MouseEvent) => {
    // Save scroll position
    scrollPositionRef.current = window.scrollY
    
    // Open deal in modal
    e.preventDefault()
    e.stopPropagation()
    setSelectedDealId(dealId)
  }

  const handleCloseDealModal = () => {
    setSelectedDealId(null)
    // Restore scroll position after modal closes
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.scrollTo({
          top: scrollPositionRef.current,
          behavior: 'instant'
        })
      }, 0)
    })
  }

  return (
    <div>
      {selectedDeals.length > 0 && (
        <div className="mb-4 p-3 bg-surface border border-border/40 rounded-lg flex items-center justify-between">
          <span className="text-sm text-foreground">
            {selectedDeals.length} {selectedDeals.length === 1 ? t('deals.deal') : t('deals.deals')} {t('common.selected')}
          </span>
          <div className="flex gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
              >
                <MoveRight className="mr-2 h-4 w-4" />
                {t('deals.changeStage')}
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
              {t('common.delete')}
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
                  aria-label={t('deals.selectAllDeals')}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t('deals.title')}</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t('deals.client')}</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t('deals.amount')}</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t('deals.stage')}</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t('deals.responsible')}</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{t('deals.lastModified')}</th>
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
                    aria-label={`${t('deals.selectDeal')} ${deal.title}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => handleDealClick(deal.id, e)}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
                  >
                    {deal.title}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{deal.client}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {formatCurrency(deal.amount)}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const stageInfo = getStageInfo(deal.stage)
                    return (
                      <span 
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border"
                        style={{
                          backgroundColor: `${stageInfo.color}15`,
                          borderColor: `${stageInfo.color}40`,
                          color: stageInfo.color
                        }}
                      >
                        {stageInfo.name}
                      </span>
                    )
                  })()}
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

      {/* Deal Detail Modal */}
      {selectedDealId && (
        <Dialog open={!!selectedDealId} onOpenChange={(open) => {
          if (!open) {
            handleCloseDealModal()
          }
        }}>
          <DialogContent 
            className="!max-w-[calc(100vw-240px)] !w-[calc(100vw-240px)] !h-screen max-h-[100vh] overflow-hidden p-0 m-0 rounded-none border-0 translate-x-0 translate-y-[-50%] top-[50%] left-[240px] animate-in fade-in-0 zoom-in-95 duration-200"
            showCloseButton={false}
          >
            <div className="h-full overflow-hidden">
              <DealDetail dealId={selectedDealId} onClose={handleCloseDealModal} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
