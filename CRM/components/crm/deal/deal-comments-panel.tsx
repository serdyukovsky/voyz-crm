"use client"

import { useState } from 'react'
import { MessageSquare, Send, Paperclip, User, Building2, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from '@/lib/i18n/i18n-context'

interface Comment {
  id: string
  type: 'comment' | 'internal_note' | 'client_message'
  message: string
  user: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  files?: Array<{ id: string; name: string; url: string }>
}

interface DealCommentsPanelProps {
  comments: Comment[]
  onAddComment: (message: string, type: 'comment' | 'internal_note' | 'client_message', files?: File[]) => Promise<void>
}

export function DealCommentsPanel({
  comments,
  onAddComment
}: DealCommentsPanelProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'comment' | 'internal_note' | 'client_message'>('comment')
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim() && files.length === 0) return

    setIsSubmitting(true)
    try {
      await onAddComment(message.trim(), activeTab, files.length > 0 ? files : undefined)
      setMessage("")
      setFiles([])
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-1">
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid w-full grid-cols-3 h-7 gap-0.5 p-0.5">
          <TabsTrigger 
            value="comment" 
            className="text-xs flex items-center justify-center gap-1 px-1.5 py-0.5"
          >
            <MessageSquare className="h-3 w-3 flex-shrink-0" />
            <span>{t('deals.comment')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="internal_note" 
            className="text-xs flex items-center justify-center gap-1 px-1.5 py-0.5"
          >
            <User className="h-3 w-3 flex-shrink-0" />
            <span>{t('deals.internalNote')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="client_message" 
            className="text-xs flex items-center justify-center gap-1 px-1.5 py-0.5"
          >
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span>{t('deals.clientMessage')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-1 space-y-1.5">
          {/* Comment Input */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-accent/50 rounded text-xs"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                activeTab === 'comment' 
                  ? t('deals.addComment')
                  : activeTab === 'internal_note'
                  ? t('deals.addInternalNote')
                  : t('deals.messageToClient')
              }
              className="min-h-[60px] resize-none text-sm pr-20"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
                multiple
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                className="h-6 text-xs px-2"
                onClick={handleSubmit}
                disabled={(!message.trim() && files.length === 0) || isSubmitting}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

