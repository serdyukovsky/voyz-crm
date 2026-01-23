"use client"

import { useState } from 'react'
import { ArrowLeft, MoreHorizontal, Check, X, Archive, Trash2, Copy } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { RoleGuard } from '@/components/shared/role-guard'
import { useTranslation } from '@/lib/i18n/i18n-context'
import type { Deal } from '@/lib/api/deals'

interface DealHeaderProps {
  deal: Deal | null
  onTitleUpdate: (title: string) => void
  onBack?: () => void
  onClose?: () => void
  onArchive?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  isNewDeal?: boolean
}

export function DealHeader({
  deal,
  onTitleUpdate,
  onBack,
  onClose,
  onArchive,
  onDelete,
  onDuplicate,
  isNewDeal = false
}: DealHeaderProps) {
  const { t } = useTranslation()
  const [isEditingTitle, setIsEditingTitle] = useState(isNewDeal)
  const [editedTitle, setEditedTitle] = useState(deal?.title || "")

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      onTitleUpdate(editedTitle.trim())
    }
    setIsEditingTitle(false)
  }

  const handleTitleCancel = () => {
    setEditedTitle(deal?.title || "")
    setIsEditingTitle(false)
  }

  if (!deal) return null

  return (
    <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/50 pl-6 pr-3 py-4">
      <div className="flex items-start gap-2">
        {(onBack || onClose) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={onClose || onBack}
          >
            {onClose ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          </Button>
        )}

        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave()
                  if (e.key === 'Escape') handleTitleCancel()
                }}
                onBlur={handleTitleSave}
                className="text-lg font-semibold border-0 px-0 py-0 h-auto focus-visible:ring-0 bg-transparent"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleTitleSave}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleTitleCancel}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <h1 
                className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                onDoubleClick={() => setIsEditingTitle(true)}
              >
                {deal.title || t('deals.untitledDeal')}
              </h1>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            {!isNewDeal && deal.number && (
              <span className="text-xs text-muted-foreground font-mono">
                {deal.number}
              </span>
            )}
            {deal.tags && deal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {deal.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs px-2 py-0.5 bg-accent/50"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                {t('deals.duplicateDeal')}
              </DropdownMenuItem>
            )}
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
              {onArchive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    {t('deals.archive')}
                  </DropdownMenuItem>
                </>
              )}
            </RoleGuard>
            <RoleGuard allowedRoles={['ADMIN']}>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </RoleGuard>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

