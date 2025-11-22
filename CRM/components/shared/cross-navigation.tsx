"use client"

import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Contact, Briefcase, CheckSquare, Building2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RelatedContact {
  id: string
  fullName: string
  email?: string
  position?: string
  companyName?: string
  stats?: {
    totalDeals: number
    activeDeals: number
  }
}

interface RelatedDeal {
  id: string
  title: string
  amount?: number
  stage?: {
    id: string
    name: string
  }
  status?: string
}

interface RelatedTask {
  id: string
  title: string
  status?: string
  priority?: string
  deadline?: string
}

interface RelatedCompany {
  id: string
  name: string
  industry?: string
  stats?: {
    totalDeals: number
    activeDeals: number
  }
}

interface CrossNavigationProps {
  contacts?: RelatedContact[]
  deals?: RelatedDeal[]
  tasks?: RelatedTask[]
  companies?: RelatedCompany[]
  className?: string
}

export function CrossNavigation({
  contacts,
  deals,
  tasks,
  companies,
  className,
}: CrossNavigationProps) {
  const hasContent = (contacts?.length || 0) + (deals?.length || 0) + (tasks?.length || 0) + (companies?.length || 0) > 0

  if (!hasContent) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      {companies && companies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {companies.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{company.name}</span>
                    {company.industry && (
                      <Badge variant="outline" className="text-xs">
                        {company.industry}
                      </Badge>
                    )}
                    {company.stats && (
                      <Badge variant="secondary" className="text-xs">
                        {company.stats.totalDeals} deals
                      </Badge>
                    )}
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {contacts && contacts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Contact className="h-4 w-4" />
              Contact{contacts.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {contacts.map((contact) => {
                  const initials = contact.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <Link
                      key={contact.id}
                      href={`/contacts/${contact.id}`}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors group"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{contact.fullName}</div>
                        {contact.position && (
                          <div className="text-xs text-muted-foreground truncate">
                            {contact.position}
                          </div>
                        )}
                        {contact.companyName && (
                          <div className="text-xs text-muted-foreground truncate">
                            {contact.companyName}
                          </div>
                        )}
                      </div>
                      {contact.stats && contact.stats.totalDeals > 0 && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {contact.stats.totalDeals}
                        </Badge>
                      )}
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {deals && deals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Deal{deals.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{deal.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {deal.amount && (
                          <Badge variant="secondary" className="text-xs">
                            ${deal.amount.toLocaleString()}
                          </Badge>
                        )}
                        {deal.stage && (
                          <Badge variant="outline" className="text-xs">
                            {deal.stage.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {tasks && tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Task{tasks.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks?taskId=${task.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.status && (
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                        )}
                        {task.priority && (
                          <Badge variant="secondary" className="text-xs">
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

