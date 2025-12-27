"use client"

import { Deal, Stage } from "./kanban-board"
import { formatDistanceToNow } from "date-fns"
import { Trash2, MoveRight, Link as LinkIcon, Users, Hash } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useState, useRef, useEffect, useMemo } from "react"
import { useTranslation } from '@/lib/i18n/i18n-context'
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { DealDetail } from './deal-detail'
import { useSidebar } from './sidebar-context'
import { useSearch } from './search-context'
import { cn } from '@/lib/utils'

interface DealsListViewProps {
  deals: Deal[]
  selectedDeals?: string[]
  onSelectDeals?: (ids: string[]) => void
  onBulkDelete?: () => void
  onBulkChangeStage?: (stage: string) => void
  stages?: Stage[]
  selectedDealId?: string | null
  onDealClick?: (dealId: string | null) => void
  searchQuery?: string
}

export function DealsListView({ 
  deals, 
  selectedDeals = [], 
  onSelectDeals,
  onBulkDelete,
  onBulkChangeStage,
  stages = [],
  selectedDealId: externalSelectedDealId,
  onDealClick,
  searchQuery = ''
}: DealsListViewProps) {
  const { t } = useTranslation()
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)
  const [internalSelectedDealId, setInternalSelectedDealId] = useState<string | null>(null)
  const selectedDealId = externalSelectedDealId !== undefined ? externalSelectedDealId : internalSelectedDealId
  const scrollPositionRef = useRef<number>(0)
  const { searchValue } = useSearch()
  const finalSearchQuery = searchQuery || searchValue || ''

  // Sync with external selectedDealId
  useEffect(() => {
    if (externalSelectedDealId !== undefined) {
      setInternalSelectedDealId(externalSelectedDealId)
    }
  }, [externalSelectedDealId])

  // Helper function to get stage info by ID
  const getStageInfo = (stageId: string, stageName?: string): { name: string; color: string } => {
    const stage = stages.find(s => s.id === stageId)
    if (stage) {
      return {
        name: stage.label || stage.name || stageId,
        color: stage.color || '#6B7280'
      }
    }
    // If stage not found in current pipeline stages, use name from deal if available
    if (stageName) {
      return {
        name: stageName,
        color: '#6B7280'
      }
    }
    // Fallback to stageId if no name available
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
    setInternalSelectedDealId(dealId)
    onDealClick?.(dealId)
  }

  const handleCloseDealModal = () => {
    console.log('DealsListView: handleCloseDealModal called')
    setInternalSelectedDealId(null)
    console.log('DealsListView: Calling onDealClick(null) to update URL')
    onDealClick?.(null)
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
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-border/40 bg-surface/30">
              <th className="w-12 px-2 py-2 align-middle">
                <div className="flex items-center justify-center">
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
                </div>
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[200px]">{t('deals.title')}</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[180px]">
                <div className="flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>Ссылка</span>
                </div>
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[140px]">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>Подписчики</span>
                </div>
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[180px]">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  <span>Направления</span>
                </div>
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[120px]">{t('deals.stage')}</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[140px]">{t('deals.responsible')}</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[140px]">{t('deals.lastModified')}</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {t('deals.noDeals') || 'Нет сделок'}
                </td>
              </tr>
            ) : (
              deals.map((deal) => {
                const isHighlighted = finalSearchQuery && deal.title.toLowerCase().includes(finalSearchQuery.toLowerCase())
                return (
                <tr
                  key={deal.id}
                  className={cn(
                    "border-b border-border/40 hover:bg-surface/30 transition-colors",
                    isHighlighted && "bg-blue-50/30 dark:bg-blue-950/10 border-blue-200/40 dark:border-blue-800/25"
                  )}
                >
                  <td className="px-2 py-2 align-middle">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedDeals.includes(deal.id)}
                        onChange={(e) => handleSelectDeal(deal.id, e.target.checked)}
                        className="w-4 h-4 rounded border-border/40 bg-background text-primary focus:ring-2 focus:ring-primary/20"
                        aria-label={`${t('deals.selectDeal')} ${deal.title}`}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={(e) => handleDealClick(deal.id, e)}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left truncate block w-full"
                      title={deal.title}
                    >
                      {deal.title}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">
                    {deal.contact?.link ? (
                      <a 
                        href={deal.contact.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                        title={deal.contact.link}
                      >
                        <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{deal.contact.link}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">
                    {deal.contact?.subscriberCount ? (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
                        <span className="truncate">{deal.contact.subscriberCount}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {deal.contact?.directions && deal.contact.directions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {deal.contact.directions.slice(0, 2).map((direction, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/50 text-xs text-muted-foreground truncate max-w-full"
                            title={direction}
                          >
                            <Hash className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{direction}</span>
                          </span>
                        ))}
                        {deal.contact.directions.length > 2 && (
                          <span className="text-xs text-muted-foreground/70">+{deal.contact.directions.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {(() => {
                      const stageInfo = getStageInfo(deal.stage, (deal as any).stageName)
                      return (
                        <span 
                          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium border truncate max-w-full"
                          style={{
                            backgroundColor: `${stageInfo.color}15`,
                            borderColor: `${stageInfo.color}40`,
                            color: stageInfo.color
                          }}
                          title={stageInfo.name}
                        >
                          <span className="truncate">{stageInfo.name}</span>
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary flex-shrink-0">
                        {deal.assignedTo.avatar}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{deal.assignedTo.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(deal.updatedAt)}</td>
                </tr>
                )
              })
            )}
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
            className="!h-screen max-h-[100vh] overflow-hidden p-0 m-0 rounded-none border-0 translate-x-0 translate-y-[-50%] top-[50%] animate-in fade-in-0 zoom-in-95 duration-200 transition-[left,width]"
            style={{
              left: isCollapsed ? '4rem' : '15rem',
              width: isCollapsed ? 'calc(100vw - 4rem)' : 'calc(100vw - 15rem)',
              maxWidth: 'none'
            }}
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
