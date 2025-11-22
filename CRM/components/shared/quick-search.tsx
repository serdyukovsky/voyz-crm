"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Contact, User, Briefcase, CheckSquare, Building2 } from 'lucide-react'
import { getContacts } from '@/lib/api/contacts'
import { getDeals } from '@/lib/api/deals'
import { getTasks } from '@/lib/api/tasks'
import type { Contact as ContactType } from '@/types/contact'
import type { Deal } from '@/lib/api/deals'
import type { Task } from '@/lib/api/tasks'

interface QuickSearchProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function QuickSearch({ open, onOpenChange }: QuickSearchProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<ContactType[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange?.(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open || !search) {
      setContacts([])
      setDeals([])
      setTasks([])
      return
    }

    const searchData = async () => {
      setLoading(true)
      try {
        const [contactsData, dealsData, tasksData] = await Promise.all([
          getContacts({ search }).catch(() => []),
          getDeals({ search }).catch(() => []),
          getTasks().catch(() => []),
        ])

        // Filter tasks by search query
        const filteredTasks = tasksData.filter(
          (task) =>
            task.title.toLowerCase().includes(search.toLowerCase()) ||
            task.description?.toLowerCase().includes(search.toLowerCase())
        )

        setContacts(contactsData)
        setDeals(dealsData)
        setTasks(filteredTasks)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchData, 300)
    return () => clearTimeout(debounceTimer)
  }, [search, open])

  const handleSelect = (type: 'contact' | 'deal' | 'task', id: string) => {
    onOpenChange?.(false)
    setSearch('')
    
    switch (type) {
      case 'contact':
        router.push(`/contacts/${id}`)
        break
      case 'deal':
        router.push(`/deals/${id}`)
        break
      case 'task':
        router.push(`/tasks?taskId=${id}`)
        break
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search contacts, deals, tasks..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? 'Searching...' : 'No results found.'}
        </CommandEmpty>

        {contacts.length > 0 && (
          <CommandGroup heading="Contacts">
            {contacts.map((contact) => {
              const initials = contact.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)

              return (
                <CommandItem
                  key={contact.id}
                  value={`contact-${contact.id}`}
                  onSelect={() => handleSelect('contact', contact.id)}
                >
                  <Contact className="mr-2 h-4 w-4" />
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1">{contact.fullName}</span>
                  {contact.companyName && (
                    <Badge variant="secondary" className="mr-2">
                      {contact.companyName}
                    </Badge>
                  )}
                  {contact.stats?.totalDeals > 0 && (
                    <Badge variant="outline" className="mr-2">
                      {contact.stats.totalDeals} deals
                    </Badge>
                  )}
                  <CommandShortcut>⌘K</CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {deals.length > 0 && (
          <CommandGroup heading="Deals">
            {deals.map((deal) => (
              <CommandItem
                key={deal.id}
                value={`deal-${deal.id}`}
                onSelect={() => handleSelect('deal', deal.id)}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                <span className="flex-1">{deal.title}</span>
                {deal.amount > 0 && (
                  <Badge variant="secondary" className="mr-2">
                    ${deal.amount.toLocaleString()}
                  </Badge>
                )}
                {deal.stage && (
                  <Badge variant="outline" className="mr-2">
                    {deal.stage.name}
                  </Badge>
                )}
                {deal.contact && (
                  <Badge variant="outline" className="mr-2">
                    {deal.contact.fullName}
                  </Badge>
                )}
                <CommandShortcut>⌘K</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {tasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`task-${task.id}`}
                onSelect={() => handleSelect('task', task.id)}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                <span className="flex-1">{task.title}</span>
                {task.status && (
                  <Badge variant="outline" className="mr-2">
                    {task.status}
                  </Badge>
                )}
                {task.deal && (
                  <Badge variant="secondary" className="mr-2">
                    {task.deal.title}
                  </Badge>
                )}
                {task.contact && (
                  <Badge variant="secondary" className="mr-2">
                    {task.contact.fullName}
                  </Badge>
                )}
                <CommandShortcut>⌘K</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}

