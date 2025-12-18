"use client"

import { useEffect } from "react"
import { CRMLayout } from "@/components/crm/layout"
import { useChatContext } from "@/components/crm/chat-context"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

export default function MessagesPage() {
  const { openChat, isOpen } = useChatContext()

  // Auto-open chat modal when page loads
  useEffect(() => {
    if (!isOpen) {
      openChat()
    }
  }, [isOpen, openChat])

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Internal messaging between team members
          </p>
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium mb-2">Messages</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {isOpen ? "Messages panel is open" : "Click the button below to open the messages panel"}
            </p>
            {!isOpen && (
              <Button onClick={() => openChat()}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Open Messages
              </Button>
            )}
          </div>
        </div>
      </div>
    </CRMLayout>
  )
}
