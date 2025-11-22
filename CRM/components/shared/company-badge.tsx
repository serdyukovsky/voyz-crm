"use client"

import { Company } from '@/lib/api/companies'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompanyBadgeProps {
  company: Company
  className?: string
  showStats?: boolean
  variant?: 'default' | 'outline' | 'secondary'
}

export function CompanyBadge({ 
  company, 
  className, 
  showStats = false,
  variant = 'default' 
}: CompanyBadgeProps) {
  if (!company) return null

  return (
    <Link
      href={`/companies/${company.id}`}
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent/50 transition-colors',
        className
      )}
    >
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{company.name}</span>
      {company.industry && (
        <Badge variant="outline" className="text-xs">
          {company.industry}
        </Badge>
      )}
      {showStats && company.stats && company.stats.totalDeals > 0 && (
        <Badge variant="secondary" className="text-xs">
          {company.stats.totalDeals} {company.stats.totalDeals === 1 ? 'deal' : 'deals'}
        </Badge>
      )}
    </Link>
  )
}

