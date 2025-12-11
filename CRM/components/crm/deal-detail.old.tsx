"use client"

import { useState, useEffect } from 'react'
import { DollarSign, MessageSquare, CheckCircle2, Clock, ChevronDown, MoreHorizontal, Check, Paperclip, Send, ChevronRight, FileText, Download, ArrowLeft, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { TaskCard } from "./task-card"
import { TaskDetailModal } from "./task-detail-modal"

interface DealDetailProps {
  dealId: string
}

export function DealDetail({ dealId }: DealDetailProps) {
  const navigate = useNavigate()
  const [selectedStage, setSelectedStage] = useState("new")
  const [assignedUser, setAssignedUser] = useState("Current User")
  const [showStageDropdown, setShowStageDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'basic': true,
    'financial': true,
    'additional': false
  })
  const [activeChatTab, setActiveChatTab] = useState<'comment' | 'employee' | 'client'>('comment')
  const [chatMessage, setChatMessage] = useState("")
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [dealTitle, setDealTitle] = useState("")
  const [dealClient, setDealClient] = useState("")
  const [dealAmount, setDealAmount] = useState(0)
  const [isNewDeal, setIsNewDeal] = useState(false)

  // Load deal data from sessionStorage or use defaults
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDeal = sessionStorage.getItem(`deal-${dealId}`)
      const isNew = sessionStorage.getItem(`deal-${dealId}-isNew`) === 'true'
      
      if (savedDeal) {
        const dealData = JSON.parse(savedDeal)
        setDealTitle(dealData.title || "")
        setDealClient(dealData.client || "")
        setDealAmount(dealData.amount || 0)
        setSelectedStage(dealData.stage || "new")
        setAssignedUser(dealData.assignedTo?.name || "Current User")
        setIsNewDeal(isNew)
      } else {
        // Default values for existing deals
        setDealTitle("Enterprise License - Q1 2024")
        setDealClient("Acme Corporation")
        setDealAmount(125000)
        setSelectedStage("qualified")
        setAssignedUser("Alex Chen")
        setIsNewDeal(false)
      }
    }
  }, [dealId])

  // Check if deal has any data - if not, don't save
  const hasDealData = dealTitle.trim() || dealClient.trim() || dealAmount > 0

  // Handle navigation away - check if deal should be saved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isNewDeal && !hasDealData) {
        // Remove from sessionStorage if no data
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`deal-${dealId}`)
          sessionStorage.removeItem(`deal-${dealId}-isNew`)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isNewDeal, hasDealData, dealId])

  const deal = {
    id: dealId,
    number: "DL-2024-0342",
    title: dealTitle,
    client: dealClient,
    amount: dealAmount,
    stage: selectedStage,
    assignedTo: assignedUser,
    createdAt: "2024-01-15",
    expectedClose: "2024-03-01",
    tags: [] as string[],
  }

  // Tasks related to this deal - empty for new deals
  const [dealTasks, setDealTasks] = useState<any[]>([])

  const handleTaskUpdate = (updatedTask: any) => {
    setDealTasks(dealTasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ))
  }

  const stages = [
    { value: "lead", label: "Lead", color: "bg-zinc-500" },
    { value: "qualified", label: "Qualified", color: "bg-slate-500" },
    { value: "proposal", label: "Proposal", color: "bg-purple-500" },
    { value: "negotiation", label: "Negotiation", color: "bg-orange-500" },
    { value: "closed", label: "Closed Won", color: "bg-green-500" },
  ]

  const users = [
    { name: "Alex Chen", avatar: "/abstract-geometric-shapes.png" },
    { name: "Sarah Lee", avatar: "/abstract-geometric-shapes.png" },
    { name: "Mike Johnson", avatar: "/diverse-group-collaborating.png" },
  ]

  // Unified timeline with all activities, tasks, and files sorted by date
  // Empty for new deals
  const defaultTimeline = [
    {
      id: "1",
      type: "stage_change",
      user: "Alex Chen",
      message: "moved deal from Lead to Qualified",
      timestamp: "2 hours ago",
      date: "Today at 2:30 PM",
      dateSort: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: "2",
      type: "comment",
      user: "Sarah Lee",
      message: "Had a great call with the client. They're interested in the enterprise package.",
      timestamp: "5 hours ago",
      date: "Today at 11:15 AM",
      dateSort: new Date(Date.now() - 5 * 60 * 60 * 1000)
    },
    {
      id: "task-1",
      type: "task",
      user: "Alex Chen",
      title: "Follow up on pricing",
      completed: false,
      dueDate: "Jan 20",
      performer: "Alex Chen",
      timestamp: "6 hours ago",
      date: "Today at 10:00 AM",
      dateSort: new Date(Date.now() - 6 * 60 * 60 * 1000)
    },
    {
      id: "file-2",
      type: "file",
      user: "Sarah Lee",
      fileName: "Contract_Draft.docx",
      fileSize: "1.1 MB",
      timestamp: "1 day ago",
      date: "Jan 16 at 2:30 PM",
      dateSort: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: "3",
      type: "task_completed",
      user: "Mike Johnson",
      title: "Send proposal document",
      message: "completed task 'Send proposal document'",
      timestamp: "1 day ago",
      date: "Jan 16 at 3:45 PM",
      dateSort: new Date(Date.now() - 25 * 60 * 60 * 1000)
    },
    {
      id: "file-1",
      type: "file",
      user: "Alex Chen",
      fileName: "Proposal_Q1_2024.pdf",
      fileSize: "2.4 MB",
      timestamp: "2 days ago",
      date: "Jan 15 at 4:00 PM",
      dateSort: new Date(Date.now() - 44 * 60 * 60 * 1000)
    },
    {
      id: "4",
      type: "field_update",
      user: "System",
      message: "updated Budget from $100,000 to $125,000",
      timestamp: "2 days ago",
      date: "Jan 15 at 2:20 PM",
      dateSort: new Date(Date.now() - 46 * 60 * 60 * 1000)
    },
    {
      id: "task-2",
      type: "task",
      user: "Sarah Lee",
      title: "Schedule demo meeting",
      completed: true,
      dueDate: "Jan 12",
      performer: "Sarah Lee",
      timestamp: "2 days ago",
      date: "Jan 15 at 1:00 PM",
      dateSort: new Date(Date.now() - 47 * 60 * 60 * 1000)
    },
    {
      id: "file-3",
      type: "file",
      user: "Mike Johnson",
      fileName: "Requirements.xlsx",
      fileSize: "856 KB",
      timestamp: "3 days ago",
      date: "Jan 14 at 3:20 PM",
      dateSort: new Date(Date.now() - 69 * 60 * 60 * 1000)
    },
    {
      id: "5",
      type: "stage_change",
      user: "Alex Chen",
      message: "created this deal",
      timestamp: "3 days ago",
      date: "Jan 15 at 9:00 AM",
      dateSort: new Date(Date.now() - 72 * 60 * 60 * 1000)
    },
  ].sort((a, b) => a.dateSort.getTime() - b.dateSort.getTime())

  const timeline = isNewDeal ? [] : defaultTimeline


  const defaultCustomFieldSections = [
    {
      id: 'basic',
      title: 'Basic Information',
      fields: [
        { label: "Industry", value: "Technology", type: "text" },
        { label: "Company Size", value: "500-1000", type: "select" },
        { label: "Source", value: "Website", type: "select" },
      ]
    },
    {
      id: 'financial',
      title: 'Financial Details',
      fields: [
        { label: "Budget", value: "$125,000", type: "number" },
        { label: "Annual Revenue", value: "$50M", type: "number" },
        { label: "Payment Terms", value: "Net 30", type: "select" },
      ]
    },
    {
      id: 'additional',
      title: 'Additional Information',
      fields: [
        { label: "Priority", value: "High", type: "select" },
        { label: "Contract Type", value: "Annual", type: "select" },
        { label: "Next Follow-up", value: "2024-01-22", type: "date" },
      ]
    }
  ]

  // Empty custom fields for new deals
  const customFieldSections = isNewDeal ? [] : defaultCustomFieldSections


  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      // In real app, send message based on activeChatTab
      console.log(`[v0] Sending ${activeChatTab} message:`, chatMessage)
      setChatMessage("")
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
      {/* LEFT COLUMN: Deal Info (Scrollable) */}
      <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-border/50 bg-accent/5">
        {/* Deal Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/50 pl-6 pr-3 py-4">
          <div className="flex items-start gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 flex-shrink-0"
              onClick={() => {
                if (isNewDeal && !hasDealData) {
                  // Remove from sessionStorage if no data
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem(`deal-${dealId}`)
                    sessionStorage.removeItem(`deal-${dealId}-isNew`)
                  }
                }
                navigate('/deals')
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <Input 
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                placeholder="Название сделки"
                className="text-lg font-semibold border-0 px-0 py-0 h-auto focus-visible:ring-0 bg-transparent mb-2"
                autoFocus={isNewDeal}
              />
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground font-mono">{deal.number}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deal.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 bg-accent/50">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Deal Info */}
        <div className="pl-6 pr-3 py-6">
          <div className="space-y-6">

          {/* Stage Select */}
          <div className="relative">
            <label className="text-xs text-muted-foreground mb-2 block">Stage</label>
            <button
              onClick={() => setShowStageDropdown(!showStageDropdown)}
              className="w-full flex items-center justify-between gap-2 px-3 h-9 rounded-md bg-background/50 border border-border/50 hover:border-border transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${stages.find(s => s.value === selectedStage)?.color}`} />
                <span className="text-sm text-foreground">{stages.find(s => s.value === selectedStage)?.label}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            
            {showStageDropdown && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border/50 bg-card shadow-lg">
                {stages.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => {
                      setSelectedStage(stage.value)
                      setShowStageDropdown(false)
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 h-9 hover:bg-accent/50 first:rounded-t-md last:rounded-b-md transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                      <span className="text-sm text-foreground">{stage.label}</span>
                    </div>
                    {selectedStage === stage.value && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Responsible User */}
          <div className="relative">
            <label className="text-xs text-muted-foreground mb-2 block">Responsible</label>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="w-full flex items-center justify-between gap-2 px-3 h-9 rounded-md bg-background/50 border border-border/50 hover:border-border transition-colors"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={users.find(u => u.name === assignedUser)?.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="text-[10px]">{assignedUser.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground">{assignedUser}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {showUserDropdown && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border/50 bg-card shadow-lg">
                {users.map((user) => (
                  <button
                    key={user.name}
                    onClick={() => {
                      setAssignedUser(user.name)
                      setShowUserDropdown(false)
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 h-9 hover:bg-accent/50 first:rounded-t-md last:rounded-b-md transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-[10px]">{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{user.name}</span>
                    </div>
                    {assignedUser === user.name && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Budget */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Budget</label>
            <div className="flex items-center gap-2 px-3 h-9 rounded-md bg-background/50 border border-border/50">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={dealAmount === 0 ? "" : dealAmount.toString()}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  setDealAmount(value ? parseFloat(value) : 0)
                }}
                placeholder="0"
                className="border-0 px-0 h-auto bg-transparent focus-visible:ring-0 text-sm font-medium flex-1"
              />
            </div>
          </div>

          {/* Related Tasks */}
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-muted-foreground">Tasks</label>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Button>
            </div>
            <div className="space-y-2">
              {dealTasks.length > 0 ? (
                dealTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                    onTaskUpdate={handleTaskUpdate}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-2">No tasks yet</p>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-border/50">
            {customFieldSections.map((section) => (
              <div key={section.id} className="space-y-2">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between text-xs font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span>{section.title}</span>
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandedSections[section.id] ? 'rotate-90' : ''}`} />
                </button>
                
                {expandedSections[section.id] && (
                  <div className="space-y-3 pl-2">
                    {section.fields.map((field, index) => (
                      <div key={index}>
                        <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                        <Input 
                          defaultValue={field.value}
                          className="h-8 text-sm bg-background/50 border-border/50"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="pt-3 space-y-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Created</span>
              <span className="text-xs text-foreground">{deal.createdAt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Expected Close</span>
              <span className="text-xs text-foreground">{deal.expectedClose}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* CENTER COLUMN: Activity Timeline + Fixed Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
          {/* Activity Timeline (scrollable) */}
          <div className="flex-1 overflow-y-auto pl-3 pr-6 py-6">
          <div className="space-y-6">
            {/* Timeline Events */}
            {timeline.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Нет истории изменений
              </div>
            ) : (
              timeline.map((activity, index) => (
              <div key={activity.id} className="flex gap-3 relative">
                {/* Timeline line */}
                {index !== timeline.length - 1 && (
                  <div className="absolute left-3 top-8 bottom-0 w-px bg-border/50" />
                )}
                
                {/* Icon */}
                <div className="relative z-10 mt-0.5">
                  {activity.type === 'stage_change' && (
                    <div className="rounded-full bg-primary/10 p-1.5">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  {activity.type === 'comment' && (
                    <div className="rounded-full bg-accent/50 p-1.5">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  {(activity.type === 'task_completed' || activity.type === 'task') && (
                    <div className={`rounded-full p-1.5 ${
                      activity.type === 'task_completed' ? 'bg-green-500/10' : 'bg-orange-500/10'
                    }`}>
                      {activity.type === 'task_completed' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-orange-500" />
                      )}
                    </div>
                  )}
                  {activity.type === 'file' && (
                    <div className="rounded-full bg-slate-100 dark:bg-blue-500/10 p-1.5">
                      <FileText className="h-3 w-3 text-slate-600 dark:text-blue-500" />
                    </div>
                  )}
                  {activity.type === 'field_update' && (
                    <div className="rounded-full bg-zinc-500/10 p-1.5">
                      <Clock className="h-3 w-3 text-zinc-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  {/* Task */}
                  {(activity.type === 'task' || activity.type === 'task_completed') && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button className="flex-shrink-0">
                            {activity.type === 'task_completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-border/50 hover:border-border transition-colors" />
                            )}
                          </button>
                          <p className={`text-sm ${
                            activity.type === 'task_completed' ? 'text-muted-foreground line-through' : 'text-foreground'
                          }`}>
                            {(activity as any).title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                          {activity.date} • Due: {(activity as any).dueDate} • {(activity as any).performer}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* File */}
                  {activity.type === 'file' && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{(activity as any).fileName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {activity.date} • {(activity as any).fileSize} • {activity.user}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Other events */}
                  {!['task', 'task_completed', 'file'].includes(activity.type) && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="font-medium">{activity.user}</span>
                          {' '}
                          <span className="text-muted-foreground">{(activity as any).message}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              ))
            )}
          </div>
          </div>

          {/* Fixed Chat Panel */}
          <div className="flex-shrink-0 border-t border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            {/* Chat Tabs */}
            <div className="flex border-b border-border/50">
            <button
              onClick={() => setActiveChatTab('comment')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeChatTab === 'comment' 
                  ? 'text-foreground border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              Comment
            </button>
            <button
              onClick={() => setActiveChatTab('employee')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeChatTab === 'employee' 
                  ? 'text-foreground border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              Message to Employee
            </button>
            <button
              onClick={() => setActiveChatTab('client')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeChatTab === 'client' 
                  ? 'text-foreground border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              Message to Client
            </button>
            </div>

            {/* Message Input */}
            <div className="p-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Textarea
                  placeholder={
                    activeChatTab === 'comment' 
                      ? "Add a comment..." 
                      : activeChatTab === 'employee'
                      ? "Send a message to your team..."
                      : "Send a message to the client..."
                  }
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="min-h-[60px] max-h-[120px] resize-none bg-background/50 border-border/50 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  className="h-9 w-9 flex-shrink-0"
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false)
            setSelectedTask(null)
          }}
          onUpdate={(updatedTask) => {
            handleTaskUpdate(updatedTask)
            setSelectedTask(updatedTask)
          }}
        />
      )}
    </div>
  )
}
