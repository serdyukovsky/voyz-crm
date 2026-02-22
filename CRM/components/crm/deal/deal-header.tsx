"use client"

import { useState, useEffect } from 'react'
import { ArrowLeft, MoreHorizontal, Check, X, Archive, Trash2, Copy, Plus, Loader2 } from 'lucide-react'
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
import type { Tag } from '@/lib/api/tags'

const TAG_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F97316',
]

interface DealHeaderProps {
  deal: Deal | null
  onTitleUpdate: (title: string) => void
  onBack?: () => void
  onClose?: () => void
  onArchive?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  isNewDeal?: boolean
  onTagAdd?: (tag: string, color?: string) => void
  onTagRemove?: (tag: string) => void
  allTags?: Tag[]
  tagsLoading?: boolean
  onTagColorChange?: (name: string, color: string) => void
}

export function DealHeader({
  deal,
  onTitleUpdate,
  onBack,
  onClose,
  onArchive,
  onDelete,
  onDuplicate,
  isNewDeal = false,
  onTagAdd,
  onTagRemove,
  allTags = [],
  tagsLoading = false,
  onTagColorChange,
}: DealHeaderProps) {
  const { t } = useTranslation()
  const [isEditingTitle, setIsEditingTitle] = useState(isNewDeal)
  const [editedTitle, setEditedTitle] = useState(deal?.title || "")

  const [isAddingTag, setIsAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tagColor, setTagColor] = useState('#3B82F6')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [localTagColors, setLocalTagColors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (allTags.length > 0) {
      setLocalTagColors(prev => {
        const next = { ...prev }
        allTags.forEach(t => { if (!next[t.name]) next[t.name] = t.color })
        return next
      })
    }
  }, [allTags])

  const getTagColor = (name: string) => localTagColors[name] || '#6B7280'

  const suggestions = allTags.filter(t => {
    if (deal?.tags?.includes(t.name)) return false
    if (!tagInput.trim()) return true
    return t.name.toLowerCase().includes(tagInput.toLowerCase())
  })

  const exactMatch = allTags.find(t => t.name.toLowerCase() === tagInput.trim().toLowerCase())

  const closeTagInput = () => {
    setIsAddingTag(false)
    setTagInput('')
    setShowColorPicker(false)
  }

  const handleAddTag = (name: string, color?: string) => {
    const finalName = name.trim()
    if (!finalName || deal?.tags?.includes(finalName)) return
    const finalColor = color || tagColor
    setLocalTagColors(prev => ({ ...prev, [finalName]: finalColor }))
    onTagAdd?.(finalName, finalColor)
    setTagInput('')
    setTagColor('#3B82F6')
    setShowColorPicker(false)
    setIsAddingTag(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (exactMatch) handleAddTag(exactMatch.name)
      else handleAddTag(tagInput.trim(), tagColor)
    } else if (e.key === 'Escape') {
      closeTagInput()
    }
  }

  const handleTitleSave = () => {
    if (editedTitle.trim()) onTitleUpdate(editedTitle.trim())
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
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose || onBack}>
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
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleTitleSave}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleTitleCancel}>
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

          {/* Tags area */}
          <div className="mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {!isNewDeal && deal.number && (
                <span className="text-xs text-muted-foreground font-mono mr-1">{deal.number}</span>
              )}

              {deal.tags?.map((tag, index) => {
                const color = getTagColor(tag)
                return (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs gap-1 pr-1 border-0 cursor-default"
                    style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    {tag}
                    {onTagRemove && (
                      <button onClick={() => onTagRemove(tag)} className="hover:opacity-60 transition-opacity ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                )
              })}

              {onTagAdd && !isAddingTag && (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  тег
                </button>
              )}
            </div>

            {/* Inline tag input — no portal, no z-index tricks */}
            {isAddingTag && (
              <div className="mt-2">
                {/* Input row */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <button
                    type="button"
                    className="w-3 h-3 rounded-full flex-shrink-0 hover:ring-2 hover:ring-offset-1 hover:ring-border transition-all"
                    style={{ backgroundColor: tagColor }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowColorPicker(v => !v)}
                    title="Выбрать цвет"
                  />
                  <input
                    autoFocus
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value)
                      if (showColorPicker) setShowColorPicker(false)
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setTimeout(closeTagInput, 150)}
                    placeholder="Тег..."
                    className="h-5 w-28 text-xs bg-transparent border border-border/60 rounded px-1.5 outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={closeTagInput}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* Color picker */}
                {showColorPicker && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {TAG_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className="w-4 h-4 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setTagColor(c); setShowColorPicker(false) }}
                      >
                        {tagColor === c && <Check className="h-2.5 w-2.5 text-white" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggestions as inline chips */}
                {tagsLoading ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Загрузка...
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {suggestions.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        className="flex items-center gap-1 px-2 py-0.5 text-xs bg-accent hover:bg-accent/70 rounded-full transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAddTag(tag.name, tag.color)}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {tagInput.trim()
                      ? `Enter — создать «${tagInput.trim()}»`
                      : allTags.length > 0 ? 'Все теги добавлены' : 'Введите название нового тега'}
                  </p>
                )}
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
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
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
