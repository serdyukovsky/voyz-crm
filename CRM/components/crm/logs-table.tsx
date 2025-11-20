'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

interface Log {
  id: string
  timestamp: string
  user: string
  action: string
  entityType: 'deal' | 'task' | 'contact'
  entityId: string
  details: string
}

const logs: Log[] = [
  { id: "1", timestamp: "2024-03-15 14:32:15", user: "Alex Chen", action: "Updated", entityType: "deal", entityId: "D-1043", details: "Changed stage from 'Negotiation' to 'Closed Won'. Updated amount to $45,000. Added note: 'Contract signed, payment scheduled.'" },
  { id: "2", timestamp: "2024-03-15 13:15:42", user: "Sarah Lee", action: "Created", entityType: "contact", entityId: "C-2891", details: "Created new contact 'John Smith' with email john.smith@techcorp.com. Added to deal 'Enterprise License'. Set role as 'Decision Maker'." },
  { id: "3", timestamp: "2024-03-15 11:48:33", user: "Mike Johnson", action: "Completed", entityType: "task", entityId: "T-5672", details: "Marked task 'Follow up with Acme Corp' as completed. Time spent: 45 minutes. Added follow-up task for next week." },
  { id: "4", timestamp: "2024-03-15 10:22:18", user: "Alex Chen", action: "Sent", entityType: "deal", entityId: "D-1038", details: "Sent proposal email to client@techstart.io. Attached PDF proposal (2.4MB). CC'd sales manager. Scheduled follow-up reminder for 3 days." },
  { id: "5", timestamp: "2024-03-14 16:55:29", user: "Sarah Lee", action: "Deleted", entityType: "contact", entityId: "C-2755", details: "Deleted contact 'Old Lead' due to duplicate entry. All associated activities merged with C-2890. Notified team members." },
  { id: "6", timestamp: "2024-03-14 15:30:44", user: "Mike Johnson", action: "Created", entityType: "deal", entityId: "D-1045", details: "Created deal 'Platform Integration' valued at $120,000. Assigned to Alex Chen. Set stage to 'New'. Expected close date: Q2 2024." },
  { id: "7", timestamp: "2024-03-14 14:12:08", user: "Alex Chen", action: "Updated", entityType: "task", entityId: "T-5668", details: "Updated task 'Review contract' due date from 2024-03-16 to 2024-03-20. Changed priority from Medium to High. Reassigned to Sarah Lee." },
  { id: "8", timestamp: "2024-03-14 09:45:51", user: "Sarah Lee", action: "Logged", entityType: "deal", entityId: "D-1042", details: "Logged discovery call (duration: 45 min). Discussed requirements, pricing, and timeline. Next steps: Send proposal by EOW. Marked as promising opportunity." },
]

const actionColors: Record<string, string> = {
  Created: "bg-green-500/10 text-green-500 border-green-500/20",
  Updated: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Deleted: "bg-red-500/10 text-red-500 border-red-500/20",
  Completed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Sent: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Logged: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
}

const entityColors: Record<string, string> = {
  deal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  task: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  contact: "bg-green-500/10 text-green-400 border-green-500/20",
}

interface LogsTableProps {
  searchQuery: string
  actionFilter: string
  userFilter: string
  entityFilter: string
}

export function LogsTable({ searchQuery, actionFilter, userFilter, entityFilter }: LogsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesUser = userFilter === 'all' || log.user === userFilter
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter

    return matchesSearch && matchesAction && matchesUser && matchesEntity
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

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 py-3 px-4"></th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Timestamp</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">User</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Action</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Entity Type</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Entity ID</th>
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
                  <td className="py-3 px-4 text-muted-foreground text-xs font-mono">{log.timestamp}</td>
                  <td className="py-3 px-4 text-foreground">{log.user}</td>
                  <td className="py-3 px-4">
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] font-medium ${actionColors[log.action]}`}
                    >
                      {log.action}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] font-medium ${entityColors[log.entityType]}`}
                    >
                      {log.entityType}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-foreground font-mono text-xs">{log.entityId}</td>
                </tr>
                {expandedRows.has(log.id) && (
                  <tr key={`${log.id}-details`} className="border-b border-border/50 bg-muted/20">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="pl-8">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
                        <p className="text-sm text-foreground leading-relaxed">{log.details}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filteredLogs.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No logs found matching your filters
          </div>
        )}
      </div>
    </div>
  )
}
