"use client"

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { DynamicFieldRenderer } from './dynamic-field-renderer'
import type { Deal, CustomField } from '@/hooks/use-deal'

interface DealFieldsPanelProps {
  deal: Deal | null
  onFieldUpdate: (fieldId: string, value: any) => void
  customFields?: CustomField[]
}

export function DealFieldsPanel({
  deal,
  onFieldUpdate,
  customFields = []
}: DealFieldsPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'basic': true,
    'financial': true,
    'additional': false
  })

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  // Group fields by their group property
  const groupedFields = customFields.reduce((acc, field) => {
    const group = field.group || 'other'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(field)
    return acc
  }, {} as Record<string, CustomField[]>)

  // Sort fields within each group by order
  Object.keys(groupedFields).forEach(groupId => {
    groupedFields[groupId].sort((a, b) => a.order - b.order)
  })

  // If no custom fields, show default groups
  if (customFields.length === 0) {
    return (
      <div className="space-y-4 pt-3">
        <div className="space-y-3">
          <div className="space-y-2">
            <button
              onClick={() => toggleGroup('basic')}
              className="w-full flex items-center justify-between text-xs font-medium text-foreground hover:text-primary transition-colors"
            >
              <span>Basic Information</span>
              {expandedGroups['basic'] ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
            {expandedGroups['basic'] && (
              <div className="space-y-3 pl-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Industry
                  </label>
                  <Input
                    defaultValue="Technology"
                    className="h-9 text-sm bg-background/50 border-border/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Company Size
                  </label>
                  <Input
                    defaultValue="500-1000"
                    className="h-9 text-sm bg-background/50 border-border/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Source
                  </label>
                  <Input
                    defaultValue="Website"
                    className="h-9 text-sm bg-background/50 border-border/50"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-3 border-t border-border/50">
            <button
              onClick={() => toggleGroup('financial')}
              className="w-full flex items-center justify-between text-xs font-medium text-foreground hover:text-primary transition-colors"
            >
              <span>Financial Details</span>
              {expandedGroups['financial'] ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
            {expandedGroups['financial'] && (
              <div className="space-y-3 pl-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Budget
                  </label>
                  <Input
                    defaultValue="$125,000"
                    className="h-9 text-sm bg-background/50 border-border/50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-3">
      {Object.entries(groupedFields).map(([groupId, fields]) => (
        <div key={groupId} className="space-y-2">
          <button
            onClick={() => toggleGroup(groupId)}
            className="w-full flex items-center justify-between text-xs font-medium text-foreground hover:text-primary transition-colors"
          >
            <span>{groupId.charAt(0).toUpperCase() + groupId.slice(1)}</span>
            {expandedGroups[groupId] ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {expandedGroups[groupId] && (
            <div className="space-y-3 pl-2">
              {fields.map((field) => (
                <div key={field.id}>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {field.name}
                  </label>
                  <DynamicFieldRenderer
                    field={field}
                    value={field.value}
                    onChange={(value) => onFieldUpdate(field.id, value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

