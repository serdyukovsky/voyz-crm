"use client"

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import type { Task } from '@/hooks/use-deal-tasks'

interface TaskQuickCreateProps {
  dealId: string
  onCreate: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>
}

export function TaskQuickCreate({ dealId, onCreate }: TaskQuickCreateProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [status, setStatus] = useState<'open' | 'in_progress' | 'completed' | 'overdue'>('open')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')

  const handleSubmit = async () => {
    if (!title.trim()) return

    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      dealId,
      dueDate: dueDate?.toISOString(),
      assignee: { id: "1", name: "Current User" },
      status,
      priority,
      completed: false
    })

    // Reset form
    setTitle("")
    setDescription("")
    setDueDate(undefined)
    setStatus('open')
    setPriority('medium')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Task
      </Button>
    )
  }

  return (
    <div className="border border-border/50 rounded-lg p-3 space-y-3 bg-background">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-foreground">Quick Create Task</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="h-8 text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
          if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
      />

      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="text-sm min-h-[60px]"
        rows={2}
      />

      <div className="grid grid-cols-2 gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs justify-start"
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {dueDate ? format(dueDate, "MMM d") : "Due date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={handleSubmit}
          disabled={!title.trim()}
        >
          Create
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

