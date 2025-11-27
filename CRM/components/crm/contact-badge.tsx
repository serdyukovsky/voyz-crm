"use client"

import { Contact } from '@/types/contact'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface ContactBadgeProps {
  contact: Contact
  className?: string
  showDealsCount?: boolean
}

export function ContactBadge({ contact, className, showDealsCount = true }: ContactBadgeProps) {
  const initials = contact.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link
      href={`/contacts/${contact.id}`}
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent/50 transition-colors',
        className
      )}
    >
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium text-foreground">{contact.fullName}</span>
      {showDealsCount && contact.stats.totalDeals > 0 && (
        <Badge variant="secondary" className="text-xs">
          {contact.stats.totalDeals} {contact.stats.totalDeals === 1 ? 'deal' : 'deals'}
        </Badge>
      )}
    </Link>
  )
}



