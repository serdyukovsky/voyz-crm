'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { getLogs, type Log as ApiLog } from '@/lib/api/logs'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n/i18n-context'

const actionColors: Record<string, string> = {
  create: "bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 dark:border-green-500/20",
  update: "bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/20",
  delete: "bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 dark:border-red-500/20",
  completed: "bg-purple-500/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/20",
  sent: "bg-orange-500/10 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 dark:border-orange-500/20",
  login: "bg-cyan-500/10 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 dark:border-cyan-500/20",
  logout: "bg-gray-500/10 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 dark:border-gray-500/20",
}

const entityColors: Record<string, string> = {
  deal: "bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/20",
  task: "bg-purple-500/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/20",
  contact: "bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 dark:border-green-500/20",
  company: "bg-orange-500/10 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 dark:border-orange-500/20",
}

interface LogsTableProps {
  searchQuery: string
  actionFilter: string
  userFilter: string
  entityFilter: string
  dateRange: string
}

export function LogsTable({ searchQuery, actionFilter, userFilter, entityFilter, dateRange }: LogsTableProps) {
  const { t } = useTranslation()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true)
      try {
        const filters: any = {}
        if (actionFilter !== 'all') filters.action = actionFilter
        if (entityFilter !== 'all') filters.entity = entityFilter
        if (userFilter !== 'all') filters.userId = userFilter

        // Handle date range filter
        if (dateRange !== 'all') {
          const now = new Date()
          let startDate: Date

          switch (dateRange) {
            case 'today':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
              filters.startDate = startDate.toISOString()
              break
            case 'yesterday':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
              const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
              filters.startDate = startDate.toISOString()
              filters.endDate = endDate.toISOString()
              break
            case 'week':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              filters.startDate = startDate.toISOString()
              break
            case 'month':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              filters.startDate = startDate.toISOString()
              break
            case 'quarter':
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
              filters.startDate = startDate.toISOString()
              break
          }
        }

        console.log('Loading logs with filters:', filters)
        const data = await getLogs(filters)
        console.log('Loaded logs:', data.length, 'items')
        setLogs(data)
      } catch (error) {
        console.error('Failed to load logs:', error)
        setLogs([])
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, userFilter, entityFilter, dateRange])

  const formatTimestamp = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm:ss')
    } catch {
      return dateString
    }
  }

  const getUserName = (log: ApiLog) => {
    if (log.user) {
      return `${log.user.firstName} ${log.user.lastName}`.trim() || log.user.email
    }
    return 'System'
  }

  const getActionLabel = (action: string) => {
    return action.charAt(0).toUpperCase() + action.slice(1)
  }

  // Client-side filtering only for search query (server handles other filters)
  const filteredLogs = logs.filter(log => {
    if (searchQuery === '') return true
    
    return getUserName(log).toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entityId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  if (loading) {
    return (
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 py-3 px-4"></th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">{t('logs.timestamp')}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">{t('logs.user')}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">{t('logs.action')}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">{t('logs.entityType')}</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">{t('logs.entityId')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <>
                <tr 
                  key={log.id} 
                  className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => toggleRow(log.id)}
                >
                  <td className="py-3 px-4">
                    {expandedRows.has(log.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs font-mono">{formatTimestamp(log.createdAt)}</td>
                  <td className="py-3 px-4 text-foreground">{getUserName(log)}</td>
                  <td className="py-3 px-4">
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] font-medium ${actionColors[log.action.toLowerCase()] || actionColors.update}`}
                    >
                      {getActionLabel(log.action)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {log.entity ? (
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] font-medium ${entityColors[log.entity.toLowerCase()] || entityColors.deal}`}
                      >
                        {log.entity}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-foreground font-mono text-xs">{log.entityId || '—'}</td>
                </tr>
                {expandedRows.has(log.id) && (
                  <tr key={`${log.id}-details`} className="border-b border-border/50 bg-muted/20">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="pl-8">
                        <p className="text-xs font-medium text-muted-foreground mb-2">{t('logs.details')}</p>
                        <p className="text-sm text-foreground leading-relaxed">{log.message}</p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t('logs.metadata')}</p>
                            <div className="text-xs bg-muted/50 p-2 rounded space-y-1">
                              {Object.entries(log.metadata).map(([key, value]) => {
                                // Format key to be more readable
                                const formattedKey = key
                                  .replace(/([A-Z])/g, ' $1')
                                  .replace(/^./, str => str.toUpperCase())
                                  .trim();
                                
                                // Format value based on type
                                let formattedValue = value;
                                if (value === null || value === undefined) {
                                  formattedValue = '—';
                                } else if (typeof value === 'object') {
                                  formattedValue = JSON.stringify(value, null, 2);
                                } else if (typeof value === 'boolean') {
                                  formattedValue = value ? 'Да' : 'Нет';
                                }
                                
                                return (
                                  <div key={key} className="flex gap-2">
                                    <span className="font-medium text-muted-foreground min-w-[120px]">{formattedKey}:</span>
                                    <span className="text-foreground break-words">{String(formattedValue)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filteredLogs.length === 0 && !loading && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {logs.length === 0 
              ? t('logs.noLogsFound')
              : searchQuery 
                ? t('logs.noLogsMatchSearch')
                : t('logs.noLogsFound')
            }
          </div>
        )}
      </div>
    </div>
  )
}
