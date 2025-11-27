"use client"

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Globe, Mail, Phone, MapPin, Users, FileText, Edit, Trash2, Briefcase, CheckSquare, Contact as ContactIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CompanyCard } from './company-card'
import { CompanyBadge } from '@/components/shared/company-badge'
import { StatsCard } from '@/components/shared/stats-card'
import { CrossNavigation } from '@/components/shared/cross-navigation'
import { DetailSkeleton } from '@/components/shared/loading-skeleton'
import { getCompany, updateCompany, deleteCompany, type Company } from '@/lib/api/companies'
import { getContacts, type Contact } from '@/lib/api/contacts'
import { getDeals, type Deal } from '@/lib/api/deals'
import { getContactTasks, type Task } from '@/lib/api/contacts'
import { useRealtimeCompany } from '@/hooks/use-realtime-company'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { useActivity } from '@/hooks/use-activity'
import { Link } from 'react-router-dom'

interface CompanyDetailProps {
  companyId: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CompanyDetail({ companyId }: CompanyDetailProps) {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToastNotification()
  const [company, setCompany] = useState<Company | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const { activities, loading: activitiesLoading } = useActivity({ entityType: 'company', entityId: companyId })

  useEffect(() => {
    loadCompany()
    loadContacts()
    loadDeals()
    loadTasks()
  }, [companyId])

  const loadCompany = async () => {
    try {
      const data = await getCompany(companyId)
      setCompany(data)
    } catch (error) {
      console.error('Failed to load company:', error)
      showError('Failed to load company', 'Please try again')
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const contactsData = await getContacts({ companyId })
      setContacts(contactsData)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    }
  }

  const loadDeals = async () => {
    try {
      const dealsData = await getDeals({ companyId })
      setDeals(dealsData)
    } catch (error) {
      console.error('Failed to load deals:', error)
    }
  }

  const loadTasks = async () => {
    try {
      // Load tasks from all company contacts
      const allTasks: Task[] = []
      for (const contact of contacts) {
        try {
          const contactTasks = await getContactTasks(contact.id)
          allTasks.push(...contactTasks)
        } catch (error) {
          console.error(`Failed to load tasks for contact ${contact.id}:`, error)
        }
      }
      setTasks(allTasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  // Reload tasks when contacts change
  useEffect(() => {
    if (contacts.length > 0) {
      loadTasks()
    }
  }, [contacts.length])

  // WebSocket integration for real-time updates
  useRealtimeCompany({
    companyId,
    onCompanyUpdated: (data) => {
      if (company) {
        setCompany({ ...company, ...data })
      }
      loadCompany()
    },
    onDealUpdated: (dealId, data) => {
      loadDeals()
    },
    onContactUpdated: (contactId, data) => {
      loadContacts()
      loadTasks()
    },
  })

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${company?.name}?`)) return

    try {
      await deleteCompany(companyId)
      showSuccess('Company deleted successfully')
      navigate('/companies')
    } catch (error) {
      console.error('Failed to delete company:', error)
      showError('Failed to delete company', 'Please try again')
    }
  }

  if (loading || !company) {
    return <DetailSkeleton />
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{company.name}</h1>
            <p className="text-sm text-muted-foreground">Company details and related information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/companies/${companyId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatsCard
          title="Total Deals"
          value={company.stats?.totalDeals || 0}
          icon={Briefcase}
        />
        <StatsCard
          title="Active Deals"
          value={company.stats?.activeDeals || 0}
          icon={Briefcase}
        />
        <StatsCard
          title="Closed Deals"
          value={company.stats?.closedDeals || 0}
          icon={Briefcase}
        />
        <StatsCard
          title="Total Volume"
          value={formatCurrency(company.stats?.totalDealVolume || 0)}
          icon={Briefcase}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Company Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Cross Navigation */}
          <CrossNavigation
            contacts={contacts.map((contact) => ({
              id: contact.id,
              fullName: contact.fullName,
              email: contact.email,
              position: contact.position,
              companyName: contact.companyName,
              stats: contact.stats,
            }))}
            deals={deals.map((deal) => ({
              id: deal.id,
              title: deal.title,
              amount: deal.amount,
              stage: deal.stage,
              status: deal.status,
            }))}
            tasks={tasks.map((task) => ({
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              deadline: task.deadline,
            }))}
          />

          {/* Company Information Card */}
          <CompanyCard company={company} />
        </div>

        {/* Right Column: Contacts, Deals & Tasks Tabs */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <Tabs defaultValue="contacts" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="contacts" className="flex items-center gap-2">
                    <ContactIcon className="h-4 w-4" />
                    Contacts ({contacts.length})
                  </TabsTrigger>
                  <TabsTrigger value="deals" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Deals ({deals.length})
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Tasks ({tasks.length})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="contacts" className="mt-0">
                  {contacts.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No contacts associated with this company
                    </div>
                  ) : (
                    <div className="border border-border/40 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Deals</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contacts.map((contact) => (
                            <TableRow
                              key={contact.id}
                              className="cursor-pointer hover:bg-accent/50"
                              onClick={() => navigate(`/contacts/${contact.id}`)}
                            >
                              <TableCell className="font-medium">{contact.fullName}</TableCell>
                              <TableCell>{contact.email || '—'}</TableCell>
                              <TableCell>{contact.phone || '—'}</TableCell>
                              <TableCell>{contact.position || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {contact.stats?.totalDeals || 0}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="deals" className="mt-0">
                  {deals.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No deals associated with this company
                    </div>
                  ) : (
                    <div className="border border-border/40 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Manager</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deals.map((deal) => (
                            <TableRow
                              key={deal.id}
                              className="cursor-pointer hover:bg-accent/50"
                              onClick={() => navigate(`/deals/${deal.id}`)}
                            >
                              <TableCell className="font-medium">{deal.title}</TableCell>
                              <TableCell>
                                {deal.stage && (
                                  <Badge variant="outline" className="text-xs">
                                    {typeof deal.stage === 'string' ? deal.stage : deal.stage.name}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={deal.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {deal.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(deal.amount)}
                              </TableCell>
                              <TableCell>
                                {deal.assignedTo && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                      {deal.assignedTo.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {deal.assignedTo.name}
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tasks" className="mt-0">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No tasks associated with this company
                    </div>
                  ) : (
                    <div className="border border-border/40 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Deadline</TableHead>
                            <TableHead>Assigned To</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.map((task) => (
                            <TableRow
                              key={task.id}
                              className="cursor-pointer hover:bg-accent/50"
                              onClick={() => navigate(`/tasks?taskId=${task.id}`)}
                            >
                              <TableCell className="font-medium">{task.title}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    task.status === 'done'
                                      ? 'default'
                                      : task.status === 'in_progress'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                  className="text-xs"
                                >
                                  {task.status?.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {task.priority && (
                                  <Badge
                                    variant={
                                      task.priority === 'high'
                                        ? 'destructive'
                                        : task.priority === 'medium'
                                        ? 'secondary'
                                        : 'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {task.priority}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {task.deadline
                                  ? new Date(task.deadline).toLocaleDateString()
                                  : '—'}
                              </TableCell>
                              <TableCell>
                                {task.assignedTo && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                      {task.assignedTo.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {task.assignedTo.name}
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="mt-0">
                  {activitiesLoading ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">Loading activities...</div>
                  ) : (
                    <ActivityTimeline activities={activities} />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

