"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import type { CustomField } from '@/lib/api/custom-fields'

interface DynamicFieldRendererProps {
  field: CustomField
  value: any
  onChange: (value: any) => void
  disabled?: boolean
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  disabled = false
}: DynamicFieldRendererProps) {
  const handleChange = (newValue: any) => {
    onChange(newValue)
  }

  switch (field.type) {
    case 'text':
      return (
        <Input
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Enter ${field.name.toLowerCase()}`}
          disabled={disabled}
          className="h-9"
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
          placeholder={`Enter ${field.name.toLowerCase()}`}
          disabled={disabled}
          className="h-9"
        />
      )

    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Enter ${field.name.toLowerCase()}`}
          disabled={disabled}
          rows={3}
        />
      )

    case 'select':
      return (
        <Select
          value={value || ''}
          onValueChange={handleChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'multi-select':
      const selectedValues = Array.isArray(value) ? value : []
      return (
        <Select
          value={selectedValues.join(',')}
          onValueChange={(val) => handleChange(val ? val.split(',') : [])}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'date':
      const dateValue = value ? new Date(value) : undefined
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-full justify-start text-left font-normal"
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateValue ? format(dateValue, "PPP") : `Select ${field.name.toLowerCase()}`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(date) => handleChange(date?.toISOString())}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )

    case 'checkbox':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={field.id}
            checked={value || false}
            onCheckedChange={handleChange}
            disabled={disabled}
          />
          <label
            htmlFor={field.id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {field.name}
          </label>
        </div>
      )

    case 'relation':
      // TODO: Implement relation field (contacts, companies, etc.)
      return (
        <Input
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`Select ${field.name.toLowerCase()}`}
          disabled={disabled}
          className="h-9"
        />
      )

    default:
      return (
        <Input
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="h-9"
        />
      )
  }
}

