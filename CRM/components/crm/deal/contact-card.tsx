"use client"

import { Card } from "@/components/ui/card"
import { Link } from "react-router-dom"
import { ExternalLink, User } from 'lucide-react'

interface ContactCardProps {
  contact: {
    id: string
    fullName: string
    email?: string
    position?: string
  } | null
}

export function ContactCard({ contact }: ContactCardProps) {
  if (!contact) {
    return null
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="p-3 border-border bg-card hover:border-primary/50 transition-colors cursor-pointer">
      <Link
        to={`/contacts/${contact.id}`}
        className="block group"
      >
        <div className="space-y-2">
          {/* Title - clickable */}
          <h4 className="text-sm font-medium text-foreground leading-tight hover:text-primary transition-colors">
            {contact.fullName}
          </h4>

          {/* Position */}
          {contact.position && (
            <div className="text-xs text-muted-foreground">
              {contact.position}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            {/* Avatar */}
            <div 
              className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20"
              title={contact.fullName}
            >
              <span className="text-[10px] font-medium text-primary">
                {getInitials(contact.fullName)}
              </span>
            </div>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>
    </Card>
  )
}
