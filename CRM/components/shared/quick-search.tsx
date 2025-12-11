"use client"

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Contact, User, Briefcase, CheckSquare, Building2, Users } from 'lucide-react'
import { getContacts } from '@/lib/api/contacts'
import { getDeals } from '@/lib/api/deals'
import { getTasks } from '@/lib/api/tasks'
import { getCompanies } from '@/lib/api/companies'
import { getUsers, type User as UserType } from '@/lib/api/users'
import type { Contact as ContactType } from '@/types/contact'
import type { Deal } from '@/lib/api/deals'
import type { Task } from '@/lib/api/tasks'
import type { Company } from '@/lib/api/companies'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface QuickSearchProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function QuickSearch({ open, onOpenChange }: QuickSearchProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<ContactType[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        onOpenChange?.(!open)
      }
    }

    document.addEventListener('keydown', down, true)
    return () => document.removeEventListener('keydown', down, true)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) {
      setContacts([])
      setDeals([])
      setTasks([])
      setCompanies([])
      setUsers([])
      setSearch('')
      return
    }

    // If search is empty, don't search yet
    if (!search || search.trim().length === 0) {
      setContacts([])
      setDeals([])
      setTasks([])
      setCompanies([])
      setUsers([])
      return
    }

    const searchData = async () => {
      setLoading(true)
      try {
        const searchLower = search.toLowerCase().trim()
        const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0)
        
        console.log('🔍 QuickSearch: Starting search for:', searchLower)
        
        // Use server-side search first, then extend on client
        const [serverContacts, serverDeals, allTasks, serverCompanies, allUsers] = await Promise.all([
          getContacts({ search }).catch((e) => { console.error('Contacts error:', e); return [] }),
          getDeals({ search }).catch((e) => { console.error('Deals error:', e); return [] }),
          getTasks().catch((e) => { console.error('Tasks error:', e); return [] }),
          getCompanies({ search }).catch((e) => { console.error('Companies error:', e); return [] }),
          getUsers().catch((e) => { console.error('Users error:', e); return [] }),
        ])

        console.log('📦 QuickSearch: Server results:', {
          contacts: serverContacts.length,
          deals: serverDeals.length,
          tasks: allTasks.length,
          companies: serverCompanies.length,
          users: allUsers.length,
        })

        // Extended client-side search for deals - search by all fields
        const filteredDeals = serverDeals.filter((deal) => {
          const searchableText = [
            deal.title,
            deal.number,
            deal.description,
            deal.contact?.fullName,
            deal.contact?.email,
            deal.company?.name,
            deal.company?.industry,
            deal.assignedTo?.name,
            deal.stage?.name,
            deal.tags?.join(' '),
            deal.rejectionReasons?.join(' '),
            deal.amount?.toString(),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          // Server already filtered by title/description, but we check all fields
          if (searchableText.includes(searchLower)) {
            return true
          }

          // Partial word match
          if (searchWords.length > 0) {
            return searchWords.some(word => searchableText.includes(word))
          }

          return false
        }).slice(0, 20)

        // Extended search for contacts - server already filtered, extend on client
        const filteredContacts = serverContacts.filter((contact) => {
          const searchableText = [
            contact.fullName,
            contact.email,
            contact.phone,
            contact.companyName,
            contact.tags?.join(' '),
            contact.directions?.join(' '),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          if (searchableText.includes(searchLower)) {
            return true
          }
          return searchWords.length > 0 && searchWords.some(word => searchableText.includes(word))
        }).slice(0, 20)

        // Extended search for tasks - client-side only (no server search)
        const filteredTasks = allTasks.filter((task) => {
          const searchableText = [
            task.title,
            task.description,
            task.contact?.fullName,
            task.deal?.title,
            task.assignedTo?.name,
            task.status,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          if (searchableText.includes(searchLower)) {
            return true
          }
          return searchWords.length > 0 && searchWords.some(word => searchableText.includes(word))
        }).slice(0, 20)

        // Extended search for companies - server already filtered, extend on client
        const filteredCompanies = serverCompanies.filter((company) => {
          const searchableText = [
            company.name,
            company.industry,
            company.email,
            company.phone,
            company.website,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          if (searchableText.includes(searchLower)) {
            return true
          }
          return searchWords.length > 0 && searchWords.some(word => searchableText.includes(word))
        }).slice(0, 20)

        // Extended search for users - client-side only (no server search)
        const filteredUsers = allUsers.filter((user) => {
          const searchableText = [
            user.firstName,
            user.lastName,
            `${user.firstName} ${user.lastName}`,
            user.email,
            user.role,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          if (searchableText.includes(searchLower)) {
            return true
          }
          return searchWords.length > 0 && searchWords.some(word => searchableText.includes(word))
        }).slice(0, 20)

        console.log('✅ QuickSearch results:', {
          search: searchLower,
          serverResults: {
            contacts: serverContacts.length,
            deals: serverDeals.length,
            companies: serverCompanies.length,
          },
          filtered: {
            contacts: filteredContacts.length,
            deals: filteredDeals.length,
            tasks: filteredTasks.length,
            companies: filteredCompanies.length,
            users: filteredUsers.length,
          },
          sampleDeals: filteredDeals.slice(0, 3).map(d => ({ id: d.id, title: d.title })),
          sampleTasks: filteredTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title })),
        })

        console.log('💾 QuickSearch: Setting state with:', {
          contacts: filteredContacts.length,
          deals: filteredDeals.length,
          tasks: filteredTasks.length,
          companies: filteredCompanies.length,
          users: filteredUsers.length,
          firstDeal: filteredDeals[0]?.title,
          firstTask: filteredTasks[0]?.title,
        })

        // Direct console logs for debugging
        console.log('🔢 FILTERED COUNTS:', 'contacts:', filteredContacts.length, 'deals:', filteredDeals.length, 'tasks:', filteredTasks.length)
        if (filteredDeals.length > 0) {
          console.log('📋 FIRST DEAL:', filteredDeals[0])
        }
        if (filteredTasks.length > 0) {
          console.log('📋 FIRST TASK:', filteredTasks[0])
        }

        setContacts(filteredContacts)
        setDeals(filteredDeals)
        setTasks(filteredTasks)
        setCompanies(filteredCompanies)
        setUsers(filteredUsers)
      } catch (error) {
        console.error('Search error:', error)
        // On error, still try to show some results
        setContacts([])
        setDeals([])
        setTasks([])
        setCompanies([])
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchData, 300)
    return () => clearTimeout(debounceTimer)
  }, [search, open])

  const handleSelect = (type: 'contact' | 'deal' | 'task' | 'company' | 'user', id: string) => {
    onOpenChange?.(false)
    setSearch('')
    
    switch (type) {
      case 'contact':
        navigate(`/contacts/${id}`)
        break
      case 'deal':
        navigate(`/deals/${id}`)
        break
      case 'task':
        navigate(`/tasks?taskId=${id}`)
        break
      case 'company':
        navigate(`/companies/${id}`)
        break
      case 'user':
        navigate(`/settings/users`)
        break
    }
  }

  const hasResults = contacts.length > 0 || deals.length > 0 || tasks.length > 0 || companies.length > 0 || users.length > 0

  console.log('🎨 QuickSearch render:', {
    open,
    search,
    loading,
    hasResults,
    counts: {
      contacts: contacts.length,
      deals: deals.length,
      tasks: tasks.length,
      companies: companies.length,
      users: users.length,
    },
    willShowContacts: !loading && contacts.length > 0,
    willShowDeals: !loading && deals.length > 0,
    willShowTasks: !loading && tasks.length > 0,
    sampleDeals: deals.slice(0, 2).map(d => ({ id: d.id, title: d.title })),
    sampleTasks: tasks.slice(0, 2).map(t => ({ id: t.id, title: t.title })),
    sampleContacts: contacts.slice(0, 2).map(c => ({ id: c.id, fullName: c.fullName })),
  })

  // Direct console logs for debugging
  if (open && search) {
    console.log('🔍 RENDER STATE:', 'loading:', loading, 'deals:', deals.length, 'tasks:', tasks.length, 'contacts:', contacts.length)
    console.log('👁️ WILL SHOW:', 'deals:', !loading && deals.length > 0, 'tasks:', !loading && tasks.length > 0, 'contacts:', !loading && contacts.length > 0)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder={t('common.searchPlaceholder')}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {loading && (
          <CommandEmpty>
            {t('common.searching')}
          </CommandEmpty>
        )}
        
        {!loading && contacts.length > 0 && (
          <CommandGroup heading={t('contacts.title')}>
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
                  value={`${contact.fullName} ${contact.email || ''} ${contact.phone || ''} ${contact.companyName || ''}`.toLowerCase()}
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

        {!loading && deals.length > 0 && (
          <CommandGroup heading={t('deals.title')}>
            {deals.map((deal) => (
              <CommandItem
                key={deal.id}
                value={`${deal.title} ${deal.number || ''} ${deal.contact?.fullName || ''} ${deal.company?.name || ''}`.toLowerCase()}
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
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && tasks.length > 0 && (
          <CommandGroup heading={t('tasks.title')}>
            {tasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`${task.title} ${task.description || ''} ${task.contact?.fullName || ''} ${task.deal?.title || ''}`.toLowerCase()}
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
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && companies.length > 0 && (
          <CommandGroup heading={t('companies.title') || 'Компании'}>
            {companies.map((company) => (
              <CommandItem
                key={company.id}
                value={`${company.name} ${company.industry || ''} ${company.email || ''} ${company.phone || ''}`.toLowerCase()}
                onSelect={() => handleSelect('company', company.id)}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span className="flex-1">{company.name}</span>
                {company.industry && (
                  <Badge variant="outline" className="mr-2">
                    {company.industry}
                  </Badge>
                )}
                {company.stats?.totalDeals > 0 && (
                  <Badge variant="secondary" className="mr-2">
                    {company.stats.totalDeals} deals
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!loading && users.length > 0 && (
          <CommandGroup heading={t('users.title') || 'Пользователи'}>
            {users.map((user) => {
              const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
              const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email
              
              return (
                <CommandItem
                  key={user.id}
                  value={`${user.firstName} ${user.lastName} ${user.email} ${user.role || ''}`.toLowerCase()}
                  onSelect={() => handleSelect('user', user.id)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials || user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1">{fullName}</span>
                  <Badge variant="outline" className="mr-2">
                    {user.email}
                  </Badge>
                  {user.role && (
                    <Badge variant="secondary" className="mr-2">
                      {user.role}
                    </Badge>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {!loading && !hasResults && search.length > 0 && (
          <CommandEmpty>
            {t('common.noResultsFound')}
          </CommandEmpty>
        )}
      </CommandList>
    </CommandDialog>
  )
}



