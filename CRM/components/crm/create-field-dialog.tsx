"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, X } from "lucide-react"
import { createCustomField, type CustomFieldType } from "@/lib/api/custom-fields"
import { useToastNotification } from "@/hooks/use-toast-notification"

interface CreateFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: 'contact' | 'deal'
  suggestedName?: string
  onFieldCreated: (fieldKey: string) => void
}

const FIELD_TYPES: Array<{ value: CustomFieldType; label: string; description: string }> = [
  { value: 'TEXT', label: 'Text', description: 'Short text input' },
  { value: 'NUMBER', label: 'Number', description: 'Numeric value' },
  { value: 'SELECT', label: 'Select', description: 'Single choice from list' },
  { value: 'MULTI_SELECT', label: 'Multi-Select', description: 'Multiple choices from list' },
  { value: 'DATE', label: 'Date', description: 'Date picker' },
  { value: 'BOOLEAN', label: 'Checkbox', description: 'Yes/No value' },
  { value: 'EMAIL', label: 'Email', description: 'Email address' },
  { value: 'PHONE', label: 'Phone', description: 'Phone number' },
  { value: 'URL', label: 'URL', description: 'Website link' },
]

export function CreateFieldDialog({
  open,
  onOpenChange,
  entityType,
  suggestedName = '',
  onFieldCreated,
}: CreateFieldDialogProps) {
  const [name, setName] = useState(suggestedName)
  const [type, setType] = useState<CustomFieldType>('TEXT')
  const [isRequired, setIsRequired] = useState(false)
  const [options, setOptions] = useState<string[]>([''])
  const [isCreating, setIsCreating] = useState(false)
  
  const { showSuccess, showError } = useToastNotification()

  const needsOptions = type === 'SELECT' || type === 'MULTI_SELECT'

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      showError('Validation Error', 'Field name is required')
      return
    }

    if (needsOptions) {
      const validOptions = options.filter(opt => opt.trim() !== '')
      if (validOptions.length === 0) {
        showError('Validation Error', 'At least one option is required for select fields')
        return
      }
    }

    setIsCreating(true)
    try {
      const validOptions = needsOptions ? options.filter(opt => opt.trim() !== '') : undefined
      
      const field = await createCustomField({
        name: name.trim(),
        type,
        entityType,
        isRequired,
        options: validOptions,
      })

      showSuccess('Field Created', `Custom field "${field.name}" has been created successfully`)
      onFieldCreated(field.key)
      onOpenChange(false)
      
      // Reset form
      setName('')
      setType('TEXT')
      setIsRequired(false)
      setOptions([''])
    } catch (error) {
      console.error('Failed to create custom field:', error)
      showError('Creation Failed', error instanceof Error ? error.message : 'Failed to create custom field')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Custom Field</DialogTitle>
          <DialogDescription>
            Add a new custom field to {entityType === 'contact' ? 'Contacts' : 'Deals'}. This field will be available for all future imports and records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Field Name */}
          <div className="space-y-2">
            <Label htmlFor="field-name">Field Name *</Label>
            <Input
              id="field-name"
              placeholder="e.g., Department, Budget, Source"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              This will be displayed in the UI and import mapping
            </p>
          </div>

          {/* Field Type */}
          <div className="space-y-2">
            <Label htmlFor="field-type">Field Type *</Label>
            <Select value={type} onValueChange={(val) => setType(val as CustomFieldType)} disabled={isCreating}>
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{ft.label}</span>
                      <span className="text-xs text-muted-foreground">{ft.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options (for SELECT/MULTI_SELECT) */}
          {needsOptions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={isCreating}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      disabled={isCreating}
                    />
                    {options.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                        disabled={isCreating}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="field-required"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(checked === true)}
              disabled={isCreating}
            />
            <Label
              htmlFor="field-required"
              className="text-sm font-normal cursor-pointer"
            >
              Make this field required
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

