"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Calendar, User, Contact, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { getPipelines, type Pipeline, type Stage } from '@/lib/api/pipelines'
import { getContacts } from '@/lib/api/contacts'
import { getUsers } from '@/lib/api/users'
import { getDeals, type Deal } from '@/lib/api/deals'
import { useTranslation } from '@/lib/i18n/i18n-context'
import { useSidebar } from './sidebar-context'

export interface DealSearchFilters {
  title?: string
  number?: string
  description?: string
  pipelineId?: string
  stageIds?: string[]
  assignedToId?: string
  contactId?: string
  createdById?: string
  amountMin?: number
  amountMax?: number
  budgetMin?: number
  budgetMax?: number
  dateFrom?: string
  dateTo?: string
  dateType?: 'created' | 'closed' | 'expectedClose' // Тип даты: созданы, закрыты или ожидаемая дата закрытия
  datePreset?: string // Пресет даты (today, yesterday, last30days, etc.)
  expectedCloseFrom?: string
  expectedCloseTo?: string
  tags?: string[]
  rejectionReasons?: string[]
  activeStagesOnly?: boolean
  // Поля контакта
  contactSubscriberCountMin?: number
  contactSubscriberCountMax?: number
  contactDirections?: string[]
  // Статусы задач
  taskStatuses?: string[]
}

interface DealSearchPreset {
  id: string
  name: string
  icon?: React.ReactNode
  filters: DealSearchFilters
}

interface DealSearchPanelProps {
  open: boolean
  onClose: () => void
  onApplyFilters?: (filters: DealSearchFilters) => void
}

export function DealSearchPanel({ open, onClose, onApplyFilters }: DealSearchPanelProps) {
  const { t } = useTranslation()
  const { isCollapsed } = useSidebar()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [isStagesOpen, setIsStagesOpen] = useState(false)
  const [isAssignedToOpen, setIsAssignedToOpen] = useState(false)
  const [isCreatedByOpen, setIsCreatedByOpen] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false)
  const [isTasksOpen, setIsTasksOpen] = useState(false)
  const [allDirections, setAllDirections] = useState<string[]>([])
  const stagesListRef = useRef<HTMLDivElement>(null)
  const assignedToRef = useRef<HTMLDivElement>(null)
  const createdByRef = useRef<HTMLDivElement>(null)
  const contactRef = useRef<HTMLDivElement>(null)
  const directionsRef = useRef<HTMLDivElement>(null)
  const tasksRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [filters, setFilters] = useState<DealSearchFilters>({
    activeStagesOnly: true,
    dateType: 'created'
  })


  // Загружаем данные
  useEffect(() => {
    if (!open) return

    const loadData = async () => {
      setLoading(true)
      try {
        const [pipelinesData, contactsData, usersData, dealsData] = await Promise.all([
          getPipelines().catch(() => []),
          getContacts().catch(() => []),
          getUsers().catch(() => []),
          getDeals().then(r => r.data).catch(() => [])
        ])

        setPipelines(pipelinesData)
        setContacts(contactsData)
        setUsers(usersData.filter(u => u.isActive))

        // Собираем все уникальные теги из сделок
        const tagsSet = new Set<string>()
        dealsData.forEach((deal: Deal) => {
          if (deal.tags) {
            deal.tags.forEach(tag => tagsSet.add(tag))
          }
        })
        setAllTags(Array.from(tagsSet).sort())

        // Собираем все уникальные направления из контактов
        const directionsSet = new Set<string>()
        contactsData.forEach((contact: any) => {
          if (contact.directions && Array.isArray(contact.directions)) {
            contact.directions.forEach((direction: string) => directionsSet.add(direction))
          }
        })
        setAllDirections(Array.from(directionsSet).sort())
      } catch (error) {
        console.error('Failed to load search data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open])

  // Получаем текущего пользователя
  const currentUser = useMemo(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        return JSON.parse(userStr)
      }
    } catch {
      return null
    }
    return null
  }, [])

  // Пресеты фильтров
  const presets: DealSearchPreset[] = useMemo(() => {
    const activeStages = pipelines.flatMap(p => 
      p.stages.filter(s => !s.isClosed)
    )

    return [
      {
        id: 'open',
        name: t('deals.search.presets.open') || 'Открытые сделки',
        icon: <CheckCircle2 className="h-4 w-4" />,
        filters: {
          stageIds: activeStages.map(s => s.id),
          activeStagesOnly: true
        }
      },
      {
        id: 'overdue-tasks',
        name: t('deals.search.presets.overdueTasks') || 'Сделки с просроченными задачами',
        icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
        filters: {
          activeStagesOnly: true,
          taskStatuses: ['overdue']
        }
      },
      {
        id: 'my-deals',
        name: t('deals.search.presets.myDeals') || 'Только мои сделки',
        icon: <CheckCircle2 className="h-4 w-4" />,
        filters: {
          assignedToId: currentUser?.id,
          activeStagesOnly: true
        }
      },
      {
        id: 'closed-won',
        name: t('deals.search.presets.closedWon') || 'Успешно завершенные',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        filters: {
          stageIds: pipelines.flatMap(p => 
            p.stages.filter(s => s.isClosed && s.name.toLowerCase().includes('won'))
          ).map(s => s.id)
        }
      },
      {
        id: 'closed-lost',
        name: t('deals.search.presets.closedLost') || 'Нереализованные сделки',
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        filters: {
          stageIds: pipelines.flatMap(p => 
            p.stages.filter(s => s.isClosed && s.name.toLowerCase().includes('lost'))
          ).map(s => s.id)
        }
      },
      {
        id: 'no-tasks',
        name: t('deals.search.presets.noTasks') || 'Сделки без задач',
        icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
        filters: {
          activeStagesOnly: true,
          taskStatuses: ['noTasks']
        }
      }
    ]
  }, [pipelines, t])

  // Используем дефолтную воронку или первую доступную
  const selectedPipeline = pipelines.find(p => p.isDefault) || pipelines[0] || null
  const activeStages = selectedPipeline?.stages.filter(s => !s.isClosed) || []
  const allStages = selectedPipeline?.stages || []

  const handlePresetClick = (preset: DealSearchPreset) => {
    setFilters({
      ...filters,
      ...preset.filters
    })
  }

  const handleApply = () => {
    onApplyFilters?.(filters)
    onClose()
  }

  // Автоприменение фильтров при изменениях, пока панель открыта
  useEffect(() => {
    if (!open) return
    onApplyFilters?.(filters)
  }, [filters, open, onApplyFilters])

  const handleClear = () => {
    setFilters({
      activeStagesOnly: true,
      dateType: 'created'
    })
  }

  // Закрываем выпадающие списки при клике вне их области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Закрываем список этапов
      if (isStagesOpen && stagesListRef.current) {
        const isInsideStagesList = stagesListRef.current.contains(target)
        const isOnStagesButton = target.closest('[data-stages-button]')
        if (!isInsideStagesList && !isOnStagesButton) {
          setIsStagesOpen(false)
        }
      }
      
      // Закрываем список менеджеров
      if (isAssignedToOpen && assignedToRef.current) {
        const isInsideList = assignedToRef.current.contains(target)
        const isOnButton = target.closest('[data-assigned-to-button]')
        if (!isInsideList && !isOnButton) {
          setIsAssignedToOpen(false)
        }
      }
      
      // Закрываем список "Кем создана"
      if (isCreatedByOpen && createdByRef.current) {
        const isInsideList = createdByRef.current.contains(target)
        const isOnButton = target.closest('[data-created-by-button]')
        if (!isInsideList && !isOnButton) {
          setIsCreatedByOpen(false)
        }
      }
      
      // Закрываем список контактов
      if (isContactOpen && contactRef.current) {
        const isInsideList = contactRef.current.contains(target)
        const isOnButton = target.closest('[data-contact-button]')
        if (!isInsideList && !isOnButton) {
          setIsContactOpen(false)
        }
      }

      // Закрываем список направлений
      if (isDirectionsOpen && directionsRef.current) {
        const isInsideList = directionsRef.current.contains(target)
        const isOnButton = target.closest('[data-directions-button]')
        if (!isInsideList && !isOnButton) {
          setIsDirectionsOpen(false)
        }
      }

      // Закрываем список задач
      if (isTasksOpen && tasksRef.current) {
        const isInsideList = tasksRef.current.contains(target)
        const isOnButton = target.closest('[data-tasks-button]')
        if (!isInsideList && !isOnButton) {
          setIsTasksOpen(false)
        }
      }
    }

    if (isStagesOpen || isAssignedToOpen || isCreatedByOpen || isContactOpen || isDirectionsOpen || isTasksOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isStagesOpen, isAssignedToOpen, isCreatedByOpen, isContactOpen, isDirectionsOpen, isTasksOpen])

  if (!open) return null

  return (
    <>
      {/* Overlay для закрытия при клике вне панели */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Панель поиска - позиционируется под топбаром, прилегает к сайдбару и топбару */}
      <div 
        className={cn(
          "fixed z-50",
          "bg-card/95 backdrop-blur-sm",
          "w-[calc(100vw-20rem)] max-w-6xl max-h-[480px]",
          "flex flex-col",
          "overflow-hidden"
        )}
        style={{
          top: '3rem', // Высота топбара
          left: isCollapsed ? '4rem' : '15rem',
          minWidth: '800px',
          boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -2px rgba(0, 0, 0, 0.03)',
          WebkitBoxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -2px rgba(0, 0, 0, 0.03)',
          MozBoxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -2px rgba(0, 0, 0, 0.03)',
          filter: 'none',
          textShadow: 'none',
          borderTop: 'none',
          marginTop: '-1px' // Перекрываем border-b топбара
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Column - Presets */}
          <div className="w-64 border-r border-border/30 overflow-y-auto bg-muted/20">
            <div className="p-3 space-y-0.5">
              <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                {t('deals.search.presets.title') || 'Быстрые фильтры'}
              </h3>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-md text-xs",
                    "hover:bg-accent/50 transition-colors",
                    "flex items-center gap-2",
                    "group",
                    "text-foreground/70 hover:text-foreground"
                  )}
                >
                  {preset.icon && (
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0">
                      {preset.icon}
                    </span>
                  )}
                  <span className="truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Middle Column - Filters */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="space-y-1.5">
              {/* Название сделки */}
              <Input
                ref={titleInputRef}
                value={filters.title || ''}
                onChange={(e) => setFilters({ ...filters, title: e.target.value || undefined })}
                placeholder={t('deals.search.fields.title') || 'Название сделки'}
                className="h-7 !text-xs md:!text-xs"
              />

              {/* Дата */}
              <div className="space-y-2">
                {/* Элемент "За все время" в стиле списка */}
                <button
                  onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-md text-xs h-7",
                    "border border-input bg-transparent",
                    "hover:bg-accent/50 transition-colors",
                    "flex items-center gap-2",
                    "group",
                    "text-foreground/70 hover:text-foreground",
                    isDateFilterOpen && "bg-accent"
                  )}
                >
                  <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  <span className="truncate">
                    {t('deals.search.fields.dateRange') || 'За все время'}
                  </span>
                </button>

                {/* Вкладки: Созданы / Закрыты - показываем только если открыто */}
                {isDateFilterOpen && (
                  <>
                    <div className="flex border-b border-border">
                  <button
                    onClick={() => setFilters({ ...filters, dateType: 'created', datePreset: undefined })}
                    className={cn(
                      "flex-1 py-1.5 px-3 text-xs font-medium transition-colors relative",
                      filters.dateType === 'created'
                        ? "text-foreground border-b-2 border-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t('deals.search.dateType.created') || 'Созданы'}
                    {filters.dateType === 'created' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, dateType: 'closed', datePreset: undefined })}
                    className={cn(
                      "flex-1 py-1.5 px-3 text-xs font-medium transition-colors relative",
                      filters.dateType === 'closed'
                        ? "text-foreground border-b-2 border-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t('deals.search.dateType.closed') || 'Закрыты'}
                    {filters.dateType === 'closed' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, dateType: 'expectedClose', datePreset: undefined })}
                    className={cn(
                      "flex-1 py-1.5 px-3 text-xs font-medium transition-colors relative",
                      filters.dateType === 'expectedClose'
                        ? "text-foreground border-b-2 border-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t('deals.search.dateType.expectedClose') || 'Ожидаемая дата закрытия'}
                    {filters.dateType === 'expectedClose' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                    )}
                  </button>
                </div>

                {/* Поле для кастомного диапазона дат */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      placeholder={t('deals.search.dateRange.from') || 'От'}
                      value={filters.datePreset 
                        ? '' 
                        : filters.dateType === 'expectedClose'
                          ? (filters.expectedCloseFrom || '')
                          : (filters.dateFrom || '')}
                      onChange={(e) => {
                        if (filters.dateType === 'expectedClose') {
                          setFilters({ 
                            ...filters, 
                            expectedCloseFrom: e.target.value || undefined,
                            datePreset: undefined
                          })
                        } else {
                          setFilters({ 
                            ...filters, 
                            dateFrom: e.target.value || undefined,
                            datePreset: undefined
                          })
                        }
                      }}
                      className="pl-9 h-7 !text-xs md:!text-xs"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs">—</span>
                  <div className="relative flex-1">
                    <Input
                      type="date"
                      placeholder={t('deals.search.dateRange.to') || 'До'}
                      value={filters.datePreset 
                        ? '' 
                        : filters.dateType === 'expectedClose'
                          ? (filters.expectedCloseTo || '')
                          : (filters.dateTo || '')}
                      onChange={(e) => {
                        if (filters.dateType === 'expectedClose') {
                          setFilters({ 
                            ...filters, 
                            expectedCloseTo: e.target.value || undefined,
                            datePreset: undefined
                          })
                        } else {
                          setFilters({ 
                            ...filters, 
                            dateTo: e.target.value || undefined,
                            datePreset: undefined
                          })
                        }
                      }}
                      className="h-7 !text-xs md:!text-xs"
                    />
                  </div>
                </div>

                {/* Список быстрых пресетов */}
                <div className="space-y-0.5">
                  {[
                    { id: 'today', label: t('deals.search.datePresets.today') || 'За сегодня' },
                    { id: 'yesterday', label: t('deals.search.datePresets.yesterday') || 'За вчера' },
                    { id: 'last30days', label: t('deals.search.datePresets.last30days') || 'За последние 30 дней' },
                    { id: 'thisWeek', label: t('deals.search.datePresets.thisWeek') || 'За эту неделю' },
                    { id: 'lastWeek', label: t('deals.search.datePresets.lastWeek') || 'За прошлую неделю' },
                    { id: 'thisMonth', label: t('deals.search.datePresets.thisMonth') || 'За этот месяц' },
                    { id: 'lastMonth', label: t('deals.search.datePresets.lastMonth') || 'За прошлый месяц' },
                    { id: 'quarter', label: t('deals.search.datePresets.quarter') || 'За квартал' },
                    { id: 'thisYear', label: t('deals.search.datePresets.thisYear') || 'За этот год' }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        const today = new Date()
                        let dateFrom: string | undefined
                        let dateTo: string | undefined

                        switch (preset.id) {
                          case 'today':
                            dateFrom = dateTo = today.toISOString().split('T')[0]
                            break
                          case 'yesterday':
                            const yesterday = new Date(today)
                            yesterday.setDate(yesterday.getDate() - 1)
                            dateFrom = dateTo = yesterday.toISOString().split('T')[0]
                            break
                          case 'last30days':
                            const last30 = new Date(today)
                            last30.setDate(last30.getDate() - 30)
                            dateFrom = last30.toISOString().split('T')[0]
                            dateTo = today.toISOString().split('T')[0]
                            break
                          case 'thisWeek':
                            const weekStart = new Date(today)
                            weekStart.setDate(today.getDate() - today.getDay())
                            dateFrom = weekStart.toISOString().split('T')[0]
                            dateTo = today.toISOString().split('T')[0]
                            break
                          case 'lastWeek':
                            const lastWeekStart = new Date(today)
                            lastWeekStart.setDate(today.getDate() - today.getDay() - 7)
                            const lastWeekEnd = new Date(lastWeekStart)
                            lastWeekEnd.setDate(lastWeekStart.getDate() + 6)
                            dateFrom = lastWeekStart.toISOString().split('T')[0]
                            dateTo = lastWeekEnd.toISOString().split('T')[0]
                            break
                          case 'thisMonth':
                            dateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
                            dateTo = today.toISOString().split('T')[0]
                            break
                          case 'lastMonth':
                            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
                            dateFrom = lastMonth.toISOString().split('T')[0]
                            dateTo = lastMonthEnd.toISOString().split('T')[0]
                            break
                          case 'quarter':
                            const quarter = Math.floor(today.getMonth() / 3)
                            dateFrom = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]
                            dateTo = today.toISOString().split('T')[0]
                            break
                          case 'thisYear':
                            dateFrom = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
                            dateTo = today.toISOString().split('T')[0]
                            break
                        }

                        setFilters({ 
                          ...filters, 
                          datePreset: preset.id,
                          dateFrom,
                          dateTo
                        })
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                        "hover:bg-accent/50 transition-colors",
                        filters.datePreset === preset.id && "bg-accent"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                  </>
                )}
              </div>

              {/* Активные этапы */}
              <div className="space-y-1.5">
                {(() => {
                  const hasSelectedStages = filters.stageIds && filters.stageIds.length > 0
                  
                  // Если список открыт, показываем "Снять выделение" или "Выделить все" на месте кнопки
                  if (isStagesOpen && selectedPipeline && allStages.length > 0) {
                    if (hasSelectedStages) {
                      // Показываем "Снять выделение"
                      return (
                        <button
                          data-stages-button
                          onClick={() => {
                            setFilters({ 
                              ...filters, 
                              stageIds: undefined,
                              activeStagesOnly: false
                            })
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                            "hover:bg-accent/50 transition-colors",
                            "flex items-center gap-2",
                            "text-foreground/70 hover:text-foreground",
                            "bg-accent"
                          )}
                        >
                          <div className="w-4 h-4 border border-muted-foreground rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px]">−</span>
                          </div>
                          <span className="truncate">
                            {t('deals.search.stages.deselectAll') || 'Снять выделение'}
                          </span>
                        </button>
                      )
                    } else {
                      // Показываем "Выделить все" с чекбоксом
                      return (
                        <button
                          data-stages-button
                          onClick={() => {
                            const allStageIds = allStages.map(s => s.id)
                            setFilters({ 
                              ...filters, 
                              stageIds: allStageIds,
                              activeStagesOnly: false
                            })
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                            "hover:bg-accent/50 transition-colors",
                            "flex items-center gap-2",
                            "text-foreground/70 hover:text-foreground",
                            "bg-accent"
                          )}
                        >
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => {}}
                            className="pointer-events-none flex-shrink-0"
                          />
                          <span className="truncate">
                            {t('deals.search.stages.selectAll') || 'Выделить все'}
                          </span>
                        </button>
                      )
                    }
                  } else {
                    // Если список закрыт, показываем "Активные этапы" или выбранные этапы
                    const selectedStages = filters.stageIds 
                      ? allStages.filter(s => filters.stageIds?.includes(s.id))
                      : []
                    
                    return (
                      <button
                        data-stages-button
                        onClick={() => {
                          if (selectedPipeline && allStages.length > 0) {
                            setIsStagesOpen(!isStagesOpen)
                          }
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                          "hover:bg-accent/50 transition-colors",
                          "flex items-center gap-2",
                          "group",
                          "text-foreground/70 hover:text-foreground",
                          isStagesOpen && "bg-accent",
                          (!selectedPipeline || allStages.length === 0) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {selectedStages.length > 0 ? (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {selectedStages.slice(0, 3).map((stage) => (
                                <div
                                  key={stage.id}
                                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs"
                                  style={{ backgroundColor: stage.color ? `${stage.color}20` : undefined }}
                                >
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: stage.color }}
                                  />
                                  <span className="truncate">{stage.name}</span>
                                </div>
                              ))}
                              {selectedStages.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{selectedStages.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <Filter className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                            <span className="truncate">
                              {t('deals.search.fields.activeStages') || 'Активные этапы'}
                            </span>
                          </>
                        )}
                      </button>
                    )
                  }
                })()}

                {/* Выпадающий список этапов */}
                {isStagesOpen && selectedPipeline && (
                  <div 
                    ref={stagesListRef}
                    className="bg-muted/30 rounded-md p-2 space-y-0.5 max-h-96 overflow-y-auto"
                  >

                    {/* Список этапов воронки */}
                    {allStages.map((stage) => {
                      const isSelected = filters.stageIds?.includes(stage.id) || false
                      return (
                        <button
                          key={stage.id}
                          onClick={() => {
                            setFilters(prev => {
                              const currentIds = prev.stageIds || []
                              const newIds = isSelected
                                ? currentIds.filter(id => id !== stage.id)
                                : [...currentIds, stage.id]

                              return {
                                ...prev,
                                stageIds: newIds.length > 0 ? newIds : undefined,
                                activeStagesOnly: false
                              }
                            })
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-background hover:bg-accent/50 transition-colors flex items-center gap-2"
                          style={{ backgroundColor: stage.color ? `${stage.color}20` : undefined }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {}}
                            className="pointer-events-none"
                          />
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="truncate">{stage.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {(!selectedPipeline || allStages.length === 0) && (
                  <p className="text-xs text-muted-foreground px-3">
                    {t('deals.search.selectPipeline') || 'Выберите воронку для выбора этапов'}
                  </p>
                )}
              </div>


              {/* Менеджеры */}
              <div className="space-y-1.5">
                {(() => {
                  const selectedUser = users.find(u => u.id === filters.assignedToId)
                  return (
                    <>
                      <button
                        data-assigned-to-button
                        onClick={() => setIsAssignedToOpen(!isAssignedToOpen)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                          "hover:bg-accent/50 transition-colors",
                          "flex items-center gap-2",
                          "group",
                          "text-foreground/70 hover:text-foreground",
                          isAssignedToOpen && "bg-accent"
                        )}
                      >
                        <User className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                        <span className="truncate">
                          {selectedUser 
                            ? `${selectedUser.firstName} ${selectedUser.lastName}`
                            : t('deals.search.fields.assignedTo') || 'Менеджеры'}
                        </span>
                      </button>
                      {isAssignedToOpen && (
                        <div 
                          ref={assignedToRef}
                          className="bg-muted/30 rounded-md p-2 space-y-0.5 max-h-96 overflow-y-auto"
                        >
                          <button
                            onClick={() => {
                              setFilters({ ...filters, assignedToId: undefined })
                              setIsAssignedToOpen(false)
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-background hover:bg-accent/50 transition-colors"
                          >
                            {t('deals.search.allValues') || 'Все значения'}
                          </button>
                          {users.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setFilters({ ...filters, assignedToId: user.id })
                                setIsAssignedToOpen(false)
                              }}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-md text-xs hover:bg-accent/50 transition-colors",
                                filters.assignedToId === user.id && "bg-accent"
                              )}
                            >
                              {user.firstName} {user.lastName}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Кем создана */}
              <div className="space-y-1.5">
                {(() => {
                  const selectedCreator = users.find(u => u.id === filters.createdById)
                  return (
                    <>
                      <button
                        data-created-by-button
                        onClick={() => setIsCreatedByOpen(!isCreatedByOpen)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                          "hover:bg-accent/50 transition-colors",
                          "flex items-center gap-2",
                          "group",
                          "text-foreground/70 hover:text-foreground",
                          isCreatedByOpen && "bg-accent"
                        )}
                      >
                        <User className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                        <span className="truncate">
                          {selectedCreator 
                            ? `${selectedCreator.firstName} ${selectedCreator.lastName}`
                            : t('deals.search.fields.createdBy') || 'Кем создана'}
                        </span>
                      </button>
                      {isCreatedByOpen && (
                        <div 
                          ref={createdByRef}
                          className="bg-muted/30 rounded-md p-2 space-y-0.5 max-h-96 overflow-y-auto"
                        >
                          <button
                            onClick={() => {
                              setFilters({ ...filters, createdById: undefined })
                              setIsCreatedByOpen(false)
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-background hover:bg-accent/50 transition-colors"
                          >
                            {t('deals.search.allValues') || 'Все значения'}
                          </button>
                          {users.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setFilters({ ...filters, createdById: user.id })
                                setIsCreatedByOpen(false)
                              }}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-md text-xs hover:bg-accent/50 transition-colors",
                                filters.createdById === user.id && "bg-accent"
                              )}
                            >
                              {user.firstName} {user.lastName}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Контакт */}
              <div className="space-y-1.5">
                {(() => {
                  const selectedContact = contacts.find(c => c.id === filters.contactId)
                  return (
                    <>
                      <button
                        data-contact-button
                        onClick={() => setIsContactOpen(!isContactOpen)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                          "hover:bg-accent/50 transition-colors",
                          "flex items-center gap-2",
                          "group",
                          "text-foreground/70 hover:text-foreground",
                          isContactOpen && "bg-accent"
                        )}
                      >
                        <Contact className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                        <span className="truncate">
                          {selectedContact 
                            ? selectedContact.fullName
                            : t('deals.search.fields.contact') || 'Контакт'}
                        </span>
                      </button>
                      {isContactOpen && (
                        <div 
                          ref={contactRef}
                          className="bg-muted/30 rounded-md p-2 space-y-0.5 max-h-96 overflow-y-auto"
                        >
                          <button
                            onClick={() => {
                              setFilters({ ...filters, contactId: undefined })
                              setIsContactOpen(false)
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-background hover:bg-accent/50 transition-colors"
                          >
                            {t('deals.search.allValues') || 'Все значения'}
                          </button>
                          {contacts.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                setFilters({ ...filters, contactId: contact.id })
                                setIsContactOpen(false)
                              }}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-md text-xs hover:bg-accent/50 transition-colors",
                                filters.contactId === contact.id && "bg-accent"
                              )}
                            >
                              {contact.fullName}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Причины отказа */}
              <Input
                value={filters.rejectionReasons?.join(', ') || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setFilters({ 
                    ...filters, 
                    rejectionReasons: value ? value.split(',').map(r => r.trim()).filter(r => r) : undefined
                  })
                }}
                placeholder={t('deals.search.fields.rejectionReasons') || 'Причины отказа (через запятую)'}
                className="h-7 !text-xs md:!text-xs"
              />

              {/* Кол-во подписчиков */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={t('deals.search.fields.contactSubscriberCount') || 'Кол-во подписчиков'}
                  value={filters.contactSubscriberCountMin || ''}
                  onChange={(e) => setFilters({ ...filters, contactSubscriberCountMin: e.target.value ? Number(e.target.value) : undefined })}
                  className="flex-1 h-7 !text-xs md:!text-xs"
                />
                <span className="text-muted-foreground text-xs">—</span>
                <Input
                  type="number"
                  placeholder={t('deals.search.fields.contactSubscriberCount') || 'Кол-во подписчиков'}
                  value={filters.contactSubscriberCountMax || ''}
                  onChange={(e) => setFilters({ ...filters, contactSubscriberCountMax: e.target.value ? Number(e.target.value) : undefined })}
                  className="flex-1 h-7 !text-xs md:!text-xs"
                />
              </div>

              {/* Направления */}
              <div className="space-y-1.5">
                {(() => {
                  const selectedDirections = filters.contactDirections || []
                  
                  return (
                    <>
                      <button
                        data-directions-button
                        onClick={() => setIsDirectionsOpen(!isDirectionsOpen)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                          "hover:bg-accent/50 transition-colors",
                          "flex items-center gap-2",
                          "group",
                          "text-foreground/70 hover:text-foreground",
                          isDirectionsOpen && "bg-accent"
                        )}
                      >
                        <span className="truncate">
                          {selectedDirections.length > 0
                            ? selectedDirections.length === 1
                              ? selectedDirections[0]
                              : `${selectedDirections.length} направлений`
                            : t('deals.search.fields.contactDirections') || 'Направления'}
                        </span>
                      </button>
                      {isDirectionsOpen && allDirections.length > 0 && (
                        <div 
                          ref={directionsRef}
                          className="bg-muted/30 rounded-md p-2 space-y-0.5 max-h-96 overflow-y-auto"
                        >
                          {(() => {
                            const hasSelected = selectedDirections.length > 0
                            
                            if (hasSelected) {
                              return (
                                <button
                                  onClick={() => {
                                    setFilters({ ...filters, contactDirections: undefined })
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                                    "hover:bg-accent/50 transition-colors",
                                    "flex items-center gap-2",
                                    "text-foreground/70 hover:text-foreground"
                                  )}
                                >
                                  <div className="w-4 h-4 border border-muted-foreground rounded flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px]">−</span>
                                  </div>
                                  <span className="truncate">
                                    {t('deals.search.stages.deselectAll') || 'Снять выделение'}
                                  </span>
                                </button>
                              )
                            } else {
                              return (
                                <button
                                  onClick={() => {
                                    setFilters({ ...filters, contactDirections: allDirections })
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                                    "hover:bg-accent/50 transition-colors",
                                    "flex items-center gap-2",
                                    "text-foreground/70 hover:text-foreground"
                                  )}
                                >
                                  <Checkbox
                                    checked={false}
                                    onCheckedChange={() => {}}
                                    className="pointer-events-none flex-shrink-0"
                                  />
                                  <span className="truncate">
                                    {t('deals.search.stages.selectAll') || 'Выделить все'}
                                  </span>
                                </button>
                              )
                            }
                          })()}
                          
                          {allDirections.map((direction) => {
                            const isSelected = selectedDirections.includes(direction)
                            return (
                              <button
                                key={direction}
                                onClick={() => {
                                  const current = filters.contactDirections || []
                                  if (isSelected) {
                                    const newDirections = current.filter(d => d !== direction)
                                    setFilters({ 
                                      ...filters, 
                                      contactDirections: newDirections.length > 0 ? newDirections : undefined
                                    })
                                  } else {
                                    setFilters({ 
                                      ...filters, 
                                      contactDirections: [...current, direction]
                                    })
                                  }
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-background hover:bg-accent/50 transition-colors flex items-center gap-2"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => {}}
                                  className="pointer-events-none"
                                />
                                <span className="truncate">{direction}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Задачи */}
              <div className="space-y-1.5">
                {(() => {
                  const selectedTasks = filters.taskStatuses || []
                  const taskOptions = [
                    { id: 'today', label: t('deals.search.tasks.today') || 'На сегодня' },
                    { id: 'tomorrow', label: t('deals.search.tasks.tomorrow') || 'На завтра' },
                    { id: 'dayAfterTomorrow', label: t('deals.search.tasks.dayAfterTomorrow') || 'На послезавтра' },
                    { id: 'thisWeek', label: t('deals.search.tasks.thisWeek') || 'На этой неделе' },
                    { id: 'thisMonth', label: t('deals.search.tasks.thisMonth') || 'В этом месяце' },
                    { id: 'thisQuarter', label: t('deals.search.tasks.thisQuarter') || 'В этом квартале' },
                    { id: 'noTasks', label: t('deals.search.tasks.noTasks') || 'Нет задач' },
                    { id: 'overdue', label: t('deals.search.tasks.overdue') || 'Просрочены' }
                  ]

                  return (
                    <>
                      <button
                        data-tasks-button
                        onClick={() => setIsTasksOpen(!isTasksOpen)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                          "hover:bg-accent/50 transition-colors",
                          "flex items-center gap-2",
                          "group",
                          "text-foreground/70 hover:text-foreground",
                          isTasksOpen && "bg-accent"
                        )}
                      >
                        <span className="truncate">
                          {selectedTasks.length > 0 ? (
                            <>
                              <span className="font-medium">{t('deals.search.tasks.title') || 'Задачи'}:</span>
                              {' '}
                              {selectedTasks.length === taskOptions.length
                                ? t('deals.search.tasks.allValues') || 'Все значения'
                                : taskOptions
                                    .filter(opt => selectedTasks.includes(opt.id))
                                    .map(opt => opt.label)
                                    .join(', ')}
                            </>
                          ) : (
                            <>
                              <span className="font-medium">{t('deals.search.tasks.title') || 'Задачи'}:</span>
                              {' '}
                              <span>{t('deals.search.tasks.allValues') || 'Все значения'}</span>
                            </>
                          )}
                        </span>
                      </button>
                      {isTasksOpen && (
                        <div
                          ref={tasksRef}
                          className="bg-muted/30 rounded-md p-2 space-y-0.5 max-h-96 overflow-y-auto"
                        >
                          {(() => {
                            const hasSelected = selectedTasks.length > 0

                            if (hasSelected) {
                              return (
                                <button
                                  onClick={() => {
                                    setFilters({ ...filters, taskStatuses: undefined })
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                                    "hover:bg-accent/50 transition-colors",
                                    "flex items-center gap-2",
                                    "text-foreground/70 hover:text-foreground"
                                  )}
                                >
                                  <div className="w-4 h-4 border border-muted-foreground rounded flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px]">−</span>
                                  </div>
                                  <span className="truncate">
                                    {t('deals.search.stages.deselectAll') || 'Снять выделение'}
                                  </span>
                                </button>
                              )
                            } else {
                              return (
                                <button
                                  onClick={() => {
                                    setFilters({ ...filters, taskStatuses: taskOptions.map(t => t.id) })
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-transparent",
                                    "hover:bg-accent/50 transition-colors",
                                    "flex items-center gap-2",
                                    "text-foreground/70 hover:text-foreground"
                                  )}
                                >
                                  <Checkbox
                                    checked={false}
                                    onCheckedChange={() => {}}
                                    className="pointer-events-none flex-shrink-0"
                                  />
                                  <span className="truncate">
                                    {t('deals.search.stages.selectAll') || 'Выделить все'}
                                  </span>
                                </button>
                              )
                            }
                          })()}

                          {taskOptions.map((task) => {
                            const isSelected = selectedTasks.includes(task.id)
                            return (
                              <button
                                key={task.id}
                                onClick={() => {
                                  const currentTasks = filters.taskStatuses || []
                                  if (isSelected) {
                                    const newTasks = currentTasks.filter(t => t !== task.id)
                                    setFilters({
                                      ...filters,
                                      taskStatuses: newTasks.length > 0 ? newTasks : undefined
                                    })
                                  } else {
                                    setFilters({
                                      ...filters,
                                      taskStatuses: [...currentTasks, task.id]
                                    })
                                  }
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-md text-xs h-7 border border-input bg-background hover:bg-accent/50 transition-colors flex items-center gap-2"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => {}}
                                  className="pointer-events-none"
                                />
                                <span className="truncate">{task.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Right Column - Tags */}
          <div className="w-64 border-l border-border/30 overflow-y-auto bg-muted/20">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium">
                  {t('deals.search.tags.title') || 'Теги'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                >
                  {t('deals.search.tags.manage') || 'Управление'}
                </Button>
              </div>

              <div className="space-y-1.5">
                <Input
                  placeholder={t('deals.search.tags.search') || 'Найти тег'}
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="h-7 !text-xs md:!text-xs"
                />
                
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {(() => {
                    const filteredTags = tagSearch 
                      ? allTags.filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase()))
                      : allTags
                    
                    if (filteredTags.length === 0) {
                      return (
                        <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                          {t('deals.search.tags.noTags') || 'Теги не найдены'}
                        </p>
                      )
                    }
                    
                    return filteredTags.map((tag) => {
                      const isSelected = filters.tags?.includes(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            const currentTags = filters.tags || []
                            if (isSelected) {
                              setFilters({ ...filters, tags: currentTags.filter(t => t !== tag) })
                            } else {
                              setFilters({ ...filters, tags: [...currentTags, tag] })
                            }
                          }}
                          className={cn(
                            "w-full text-left px-2 py-1 rounded-md text-xs",
                            "hover:bg-accent/50 transition-colors",
                            "flex items-center justify-between",
                            isSelected && "bg-accent"
                          )}
                        >
                          <span className="truncate">{tag}</span>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                          )}
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка очистки в левом нижнем углу */}
        <div className="absolute bottom-3 left-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
          >
            {t('deals.search.clear') || 'Очистить'}
          </Button>
        </div>

        {/* Кнопка применения в правом нижнем углу */}
        <div className="absolute bottom-3 right-3">
          <Button
            size="sm"
            onClick={handleApply}
            className="h-6 text-[11px] px-3"
          >
            {t('deals.search.apply') || 'Применить'}
          </Button>
        </div>

      </div>
    </>
  )
}

