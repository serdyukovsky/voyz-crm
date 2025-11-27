"use client"

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Building2, Edit, Trash2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SocialLinks } from './social-links'
import { getContact, getContactTasks, deleteContact } from '@/lib/api/contacts'
import { Contact, Task } from '@/types/contact'
import { CreateContactModal } from './create-contact-modal'
import { getCompanies } from '@/lib/api/contacts'
import { Link } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, CheckSquare, Clock } from 'lucide-react'
import { useRealtimeContact } from '@/hooks/use-realtime-contact'
import { CrossNavigation } from '@/components/shared/cross-navigation'
import { DetailSkeleton } from '@/components/shared/loading-skeleton'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { useActivity } from '@/hooks/use-activity'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { getDeals } from '@/lib/api/deals'
import { SendEmailModal } from '@/components/crm/send-email-modal'

interface ContactDetailProps {
  contactId: string
}

export function ContactDetail({ contactId }: ContactDetailProps) {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToastNotification()
  const [contact, setContact] = useState<Contact | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [companies, setCompanies] = useState([])
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const { activities, loading: activitiesLoading } = useActivity({ entityType: 'contact', entityId: contactId })

  useEffect(() => {
    loadContact()
    loadCompanies()
    loadTasks()
    loadDeals()
  }, [contactId])

  const loadDeals = async () => {
    try {
      const dealsData = await getDeals({ contactId })
      setDeals(dealsData)
    } catch (error) {
      console.error('Failed to load deals:', error)
    }
  }

  // WebSocket integration for real-time updates
  useRealtimeContact({
    contactId,
    onDealUpdated: (dealId, data) => {
      // Reload contact to get updated stats
      loadContact()
    },
    onTaskUpdated: (taskId, data) => {
      // Reload tasks
      loadTasks()
    },
    onContactUpdated: (data) => {
      // Update contact data
      if (contact) {
        setContact({ ...contact, ...data })
      }
    },
  })

  const loadContact = async () => {
    try {
      const data = await getContact(contactId)
      setContact(data)
    } catch (error) {
      console.error('Failed to load contact:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
      const data = await getCompanies()
      setCompanies(data)
    } catch (error) {
      console.error('Failed to load companies:', error)
    }
  }

  const loadTasks = async () => {
    try {
      const data = await getContactTasks(contactId)
      setTasks(data)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      await deleteContact(contactId)
      showSuccess('Contact deleted successfully')
      navigate('/contacts')
    } catch (error) {
      console.error('Failed to delete contact:', error)
      showError('Failed to delete contact', 'Please try again')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Contact not found</div>
      </div>
    )
  }

  const initials = contact.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/50 bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/contacts')}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {contact.fullName}
                </h1>
                {contact.position && (
                  <p className="text-sm text-muted-foreground">{contact.position}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-red-500 hover:text-red-600 hover:border-red-500/50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left Column: Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Cross Navigation */}
            <CrossNavigation
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
              companies={
                contact.company
                  ? [
                      {
                        id: contact.company.id,
                        name: contact.company.name,
                        industry: contact.company.industry,
                        stats: contact.stats,
                      },
                    ]
                  : []
              }
            />
            {/* Contact Information Card */}
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  Contact Information
                </h2>

                <div className="space-y-4">
                  {contact.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Email</p>
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-sm text-foreground hover:text-primary break-all"
                        >
                          {contact.email}
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEmailModalOpen(true)}
                          className="mt-2 w-full"
                        >
                          <Mail className="mr-2 h-3.5 w-3.5" />
                          Send Email
                        </Button>
                      </div>
                    </div>
                  )}

                  {contact.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Phone</p>
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-sm text-foreground hover:text-primary"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {(contact.companyName || contact.company) && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Company</p>
                        {contact.company ? (
                          <Link
                            href={`/companies/${contact.company.id}`}
                            className="text-sm text-foreground hover:text-primary"
                          >
                            {contact.company.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-foreground">{contact.companyName}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-2">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {contact.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {contact.social && Object.keys(contact.social).length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="h-4 w-4 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-2">Social Links</p>
                        <SocialLinks contact={contact} size="md" />
                      </div>
                    </div>
                  )}

                  {contact.notes && (
                    <div className="flex items-start gap-3">
                      <div className="h-4 w-4 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {contact.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Deal Statistics Card */}
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-sm font-semibold text-foreground mb-4">Deal Statistics</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Active Deals</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {contact.stats.activeDeals}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Closed Deals</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {contact.stats.closedDeals}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Deals</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {contact.stats.totalDeals}
                    </p>
                  </div>
                  {contact.stats.totalDealVolume !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Volume</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatCurrency(contact.stats.totalDealVolume)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Deals & Tasks Tabs */}
          <div className="lg:col-span-2">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <Tabs defaultValue="deals" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="deals" className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Deals ({contact.deals?.length || 0})
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

                  <TabsContent value="deals" className="mt-0">
                    {!contact.deals || contact.deals.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No deals associated with this contact
                      </div>
                    ) : (
                      <div className="border border-border/40 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Stage</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Manager</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contact.deals.map((deal) => (
                              <TableRow
                                key={deal.id}
                                className="cursor-pointer hover:bg-accent/50"
                                onClick={() => navigate(`/deals/${deal.id}`)}
                              >
                                <TableCell className="font-medium">{deal.name}</TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-border/40 text-muted-foreground">
                                    {deal.stage.replace('-', ' ').replace(/\b\w/g, (l) =>
                                      l.toUpperCase()
                                    )}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                      deal.status === 'active'
                                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                        : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
                                    }`}
                                  >
                                    {deal.status}
                                  </span>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(deal.amount)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                      {deal.responsibleManager.avatar}
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {deal.responsibleManager.name}
                                    </span>
                                  </div>
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
                        No tasks associated with this contact
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
                                onClick={() => navigate(`/tasks?contactId=${contactId}`)}
                              >
                                <TableCell className="font-medium">{task.title}</TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                      task.status === 'done'
                                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                        : task.status === 'in_progress'
                                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                        : task.status === 'overdue'
                                        ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                        : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
                                    }`}
                                  >
                                    {task.status.replace('_', ' ')}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {task.priority && (
                                    <span
                                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                        task.priority === 'high'
                                          ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                          : task.priority === 'medium'
                                          ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                                          : 'bg-gray-500/10 text-gray-600 border border-gray-500/20'
                                      }`}
                                    >
                                      {task.priority}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {task.deadline
                                    ? new Date(task.deadline).toLocaleDateString()
                                    : '-'}
                                </TableCell>
                                <TableCell>
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

      {/* Edit Modal */}
      <CreateContactModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={() => {
          setIsEditModalOpen(false)
          loadContact()
        }}
        companies={companies}
        contactId={contactId}
        initialData={{
          fullName: contact.fullName,
          email: contact.email,
          phone: contact.phone,
          position: contact.position,
          companyName: contact.companyName,
          companyId: contact.companyId,
          tags: contact.tags,
          notes: contact.notes,
          social: contact.social,
        }}
      />

      {/* Send Email Modal */}
      {contact && (
        <SendEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          to={contact.email}
          contactId={contactId}
          companyId={contact.companyId}
        />
      )}
    </div>
  )
}

