"use client"

import { Company } from '@/lib/api/companies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Globe, Mail, Phone, MapPin, Users, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SocialLinks } from './social-links'
import { Link } from 'react-router-dom'

interface CompanyCardProps {
  company: Company
  className?: string
}

export function CompanyCard({ company, className }: CompanyCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span>{company.name}</span>
          {company.industry && (
            <Badge variant="outline" className="ml-auto">
              {company.industry}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {company.website && (
          <div className="flex items-start gap-3">
            <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Website</p>
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {company.website}
              </a>
            </div>
          </div>
        )}

        {company.email && (
          <div className="flex items-start gap-3">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Email</p>
              <a
                href={`mailto:${company.email}`}
                className="text-sm text-foreground hover:text-primary break-all"
              >
                {company.email}
              </a>
            </div>
          </div>
        )}

        {company.phone && (
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Phone</p>
              <a
                href={`tel:${company.phone}`}
                className="text-sm text-foreground hover:text-primary"
              >
                {company.phone}
              </a>
            </div>
          </div>
        )}

        {company.address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Address</p>
              <p className="text-sm text-foreground">{company.address}</p>
            </div>
          </div>
        )}

        {company.employees && (
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Employees</p>
              <p className="text-sm text-foreground">{company.employees.toLocaleString()}</p>
            </div>
          </div>
        )}

        {company.notes && (
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{company.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}



