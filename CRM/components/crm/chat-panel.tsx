"use client"

import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageSquare, Target, CheckSquare, Users, Search, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useChatThreads, useChatThread, useCreateThread, useSendMessage } from '@/hooks/use-chat'
import { getUsers, type User } from '@/lib/api/users'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from '@/lib/i18n/i18n-context'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  dealId?: string
  taskId?: string
  initialParticipantIds?: string[]
}

export function ChatPanel({
  isOpen,
  onClose,
  dealId,
  taskId,
  initialParticipantIds = [],
}: ChatPanelProps) {
  const { t } = useTranslation()
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: threads, isLoading: threadsLoading, error: threadsError } = useChatThreads()
  const { data: thread, isLoading: threadLoading, error: threadError } = useChatThread(selectedThreadId)
  const createThreadMutation = useCreateThread()
  const sendMessageMutation = useSendMessage(selectedThreadId || '')

  // Load users
  useEffect(() => {
    if (isOpen) {
      getUsers()
        .then(setUsers)
        .catch(console.error)
    }
  }, [isOpen])

  // Auto-create or select thread when opening
  useEffect(() => {
    if (isOpen && !selectedThreadId && (dealId || taskId)) {
      handleCreateOrSelectThread()
    }
  }, [isOpen, dealId, taskId])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages])

  const handleCreateOrSelectThread = async () => {
    try {
      // Try to find existing thread
      if (threads) {
        const existingThread = threads.find(
          (t) =>
            (dealId && t.dealId === dealId) ||
            (taskId && t.taskId === taskId)
        )

        if (existingThread) {
          setSelectedThreadId(existingThread.id)
          return
        }
      }

      // Create new thread only if we have deal/task context
      if (!dealId && !taskId) {
        return
      }

      const currentUserId = localStorage.getItem('user_id') || localStorage.getItem('userId')
      if (!currentUserId) {
        return
      }

      const newThread = await createThreadMutation.mutateAsync({
        dealId,
        taskId,
        participantIds: [],
        title: dealId || taskId ? undefined : undefined,
      })

      setSelectedThreadId(newThread.id)
    } catch (error) {
      console.error('Failed to create thread:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedThreadId) return

    try {
      await sendMessageMutation.mutateAsync({
        content: message,
        dealId,
        taskId,
      })
      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleUserClick = async (userId: string) => {
    try {
      // Try multiple ways to get current user ID
      const userStr = localStorage.getItem('user')
      let currentUserId: string | null = null
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          currentUserId = user.id || user.userId || user.sub
        } catch (e) {
          console.warn('Failed to parse user from localStorage:', e)
        }
      }
      
      if (!currentUserId) {
        currentUserId = localStorage.getItem('user_id') || localStorage.getItem('userId') || localStorage.getItem('sub')
      }
      
      if (!currentUserId) {
        console.error('Current user ID not found in localStorage')
        alert('Please log in again')
        return
      }
      
      if (userId === currentUserId) {
        console.warn('Cannot create thread with yourself')
        return
      }

      console.log('Creating thread with user:', userId, 'currentUserId:', currentUserId)

      // First, try to find existing thread with this user
      if (threads && threads.length > 0) {
        const existingThread = threads.find((thread) => {
          const participantIds = thread.participants?.map((p) => p.id) || []
          const hasBothUsers = participantIds.includes(userId) && participantIds.includes(currentUserId || '')
          const isDirectChat = participantIds.length === 2
          const noContext = !thread.dealId && !thread.taskId
          return hasBothUsers && isDirectChat && noContext
        })

        if (existingThread) {
          console.log('Found existing thread:', existingThread.id)
          setSelectedThreadId(existingThread.id)
          setShowNewChatDialog(false)
          setUserSearchQuery('')
          return
        }
      }

      // Create new thread
      console.log('Creating new thread with participantIds:', [userId])
      const newThread = await createThreadMutation.mutateAsync({
        participantIds: [userId],
        title: undefined,
      })

      console.log('Thread created:', newThread)
      if (newThread && newThread.id) {
        setSelectedThreadId(newThread.id)
        setShowNewChatDialog(false)
        setUserSearchQuery('')
      } else {
        console.error('Thread creation returned invalid data:', newThread)
      }
    } catch (error: any) {
      console.error('Failed to create thread:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create chat'
      alert(errorMessage)
    }
  }

  const filteredThreads = threads?.filter((thread) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      thread.title?.toLowerCase().includes(query) ||
      thread.participants.some((p) => p?.name?.toLowerCase().includes(query)) ||
      thread.deal?.title.toLowerCase().includes(query) ||
      thread.task?.title.toLowerCase().includes(query)
    )
  })

  const filteredUsers = users.filter((user) => {
    const currentUserId = localStorage.getItem('user_id') || localStorage.getItem('userId')
    if (user.id === currentUserId) return false
    if (!userSearchQuery) return true
    const query = userSearchQuery.toLowerCase()
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || ''
    return fullName.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query) || false
  })

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('chat.messages') || 'Messages'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Threads List */}
          <div className="w-80 border-r flex flex-col">
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('chat.searchThreads') || 'Search threads...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={() => setShowNewChatDialog(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('chat.newChat') || 'New Chat'}
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {threadsError ? (
                <div className="p-4 text-sm text-destructive">
                  {t('common.error') || 'Error loading threads'}
                </div>
              ) : threadsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">
                  {t('common.loading') || 'Loading...'}
                </div>
              ) : filteredThreads && filteredThreads.length > 0 ? (
                <div className="p-2">
                  {filteredThreads.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={cn(
                        'w-full p-3 rounded-lg text-left transition-colors mb-2',
                        selectedThreadId === thread.id
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'hover:bg-sidebar-accent/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          {thread.participants.length === 2 ? (
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={thread.participants.find((p) => p.id !== localStorage.getItem('user_id'))?.avatar}
                              />
                              <AvatarFallback>
                                {getInitials(
                                  thread.participants.find((p) => p.id !== localStorage.getItem('user_id'))?.name || 'U'
                                )}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          {thread.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                              {thread.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {thread.title ||
                                thread.participants
                                  .filter((p) => p.id !== (localStorage.getItem('user_id') || localStorage.getItem('userId')))
                                  .map((p) => p?.name || 'User')
                                  .join(', ') ||
                                'Chat'}
                            </span>
                          </div>
                          {thread.deal && (
                            <div className="flex items-center gap-1 mb-1">
                              <Target className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">
                                {thread.deal.title}
                              </span>
                            </div>
                          )}
                          {thread.task && (
                            <div className="flex items-center gap-1 mb-1">
                              <CheckSquare className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">
                                {thread.task.title}
                              </span>
                            </div>
                          )}
                          {thread.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate">
                              {thread.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  {t('chat.noThreads') || 'No threads yet'}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedThreadId ? (
              <>
                {threadError ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-sm text-destructive">
                      {t('common.error') || 'Error loading thread'}
                    </div>
                  </div>
                ) : threadLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">
                      {t('common.loading') || 'Loading...'}
                    </div>
                  </div>
                ) : thread ? (
                  <>
                    {/* Thread Header */}
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {thread.title ||
                              thread.participants
                                .filter((p) => p.id !== localStorage.getItem('user_id'))
                                .map((p) => p?.name || 'User')
                                .join(', ') ||
                              'Chat'}
                          </h3>
                          {thread.deal && (
                            <div className="flex items-center gap-2 mt-1">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {thread.deal.title}
                              </span>
                            </div>
                          )}
                          {thread.task && (
                            <div className="flex items-center gap-2 mt-1">
                              <CheckSquare className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {thread.task.title}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {thread.participants?.map((participant) => (
                            <Avatar key={participant?.id || Math.random()} className="h-8 w-8">
                              <AvatarImage src={participant?.avatar} />
                              <AvatarFallback>{getInitials(participant?.name)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {thread.messages && Array.isArray(thread.messages) && thread.messages.length > 0 ? (
                          thread.messages.map((msg) => {
                            if (!msg?.sender) return null
                            const isOwn = msg.sender?.id === (localStorage.getItem('user_id') || localStorage.getItem('userId'))
                            return (
                              <div
                                key={msg.id}
                                className={cn('flex gap-3', isOwn && 'flex-row-reverse')}
                              >
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={msg.sender?.avatar} />
                                  <AvatarFallback>{getInitials(msg.sender?.name)}</AvatarFallback>
                                </Avatar>
                                <div className={cn('flex-1 max-w-[70%]', isOwn && 'items-end flex flex-col')}>
                                  <div
                                    className={cn(
                                      'rounded-lg px-4 py-2',
                                      isOwn
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                  </div>
                                  {(msg.deal || msg.task) && (
                                    <div className="mt-1 flex items-center gap-2">
                                      {msg.deal && (
                                        <Badge variant="outline" className="text-xs">
                                          <Target className="h-3 w-3 mr-1" />
                                          {msg.deal.title}
                                        </Badge>
                                      )}
                                      {msg.task && (
                                        <Badge variant="outline" className="text-xs">
                                          <CheckSquare className="h-3 w-3 mr-1" />
                                          {msg.task.title}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-center text-sm text-muted-foreground py-8">
                            {t('chat.noMessages') || 'No messages yet. Start the conversation!'}
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder={t('chat.typeMessage') || 'Type a message...'}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          disabled={sendMessageMutation.isPending}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!message.trim() || sendMessageMutation.isPending}
                          size="icon"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">
                      {t('chat.threadNotFound') || 'Thread not found'}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {t('chat.selectThread') || 'Select a thread to start chatting'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('chat.newChat') || 'New Chat'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('chat.searchUsers') || 'Search users...'}
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-2">
                {filteredUsers.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    {t('chat.noUsers') || 'No users found'}
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'User'
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{fullName}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewChatDialog(false)
                  setUserSearchQuery('')
                }}
              >
                {t('common.close') || 'Close'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
