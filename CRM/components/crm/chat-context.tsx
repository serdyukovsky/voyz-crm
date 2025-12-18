"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import { ChatPanel } from './chat-panel'

interface ChatContextType {
  isOpen: boolean
  openChat: (dealId?: string, taskId?: string, participantIds?: string[]) => void
  closeChat: () => void
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [dealId, setDealId] = useState<string | undefined>()
  const [taskId, setTaskId] = useState<string | undefined>()
  const [participantIds, setParticipantIds] = useState<string[]>([])

  const openChat = (dealId?: string, taskId?: string, participantIds: string[] = []) => {
    setDealId(dealId)
    setTaskId(taskId)
    setParticipantIds(participantIds)
    setIsOpen(true)
  }

  const closeChat = () => {
    setIsOpen(false)
    setDealId(undefined)
    setTaskId(undefined)
    setParticipantIds([])
  }

  return (
    <ChatContext.Provider value={{ isOpen, openChat, closeChat }}>
      {children}
      <ChatPanel
        isOpen={isOpen}
        onClose={closeChat}
        dealId={dealId}
        taskId={taskId}
        initialParticipantIds={participantIds}
      />
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    console.warn('useChatContext called outside ChatProvider, returning fallback')
    // Return a fallback to prevent crashes
    return {
      isOpen: false,
      openChat: () => {
        console.warn('Chat functionality not available - ChatProvider not found')
      },
      closeChat: () => {},
    }
  }
  return context
}
