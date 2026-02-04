"use client"

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, X, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
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

type MessageType = 'internal_note' | 'comment'

export function DealCommentsPanel({
  comments,
  onAddComment
}: DealCommentsPanelProps) {
  const { t } = useTranslation()
  const [messageType, setMessageType] = useState<MessageType>('comment')
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = async () => {
    if (!message.trim() && files.length === 0) return

    setIsSubmitting(true)
    try {
      await onAddComment(message.trim(), messageType, files.length > 0 ? files : undefined)
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

  const typeLabels: Record<MessageType, string> = {
    internal_note: 'Примечание',
    comment: 'Комментарий'
  }

  const handleTypeSelect = (type: MessageType) => {
    setMessageType(type)
    setIsDropdownOpen(false)
    // Focus input after selection
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className="space-y-2">
      {/* Files preview */}
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

      {/* Input with integrated type selector */}
      <div className="relative border border-border rounded-md rounded-br-3xl bg-background focus-within:ring-1 focus-within:ring-ring min-h-[80px]" ref={dropdownRef}>
        <div className="flex items-start">
          {/* Type selector button inside input */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="pl-3 pt-3 text-sm text-primary hover:text-primary/80 underline underline-offset-2 cursor-pointer transition-colors whitespace-nowrap"
          >
            {typeLabels[messageType]}
          </button>
          <span className="text-sm text-muted-foreground pt-3">:</span>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 bottom-full mb-1 bg-card border border-border rounded-md shadow-lg z-50 min-w-[140px] py-1">
              {(Object.keys(typeLabels) as MessageType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeSelect(type)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                >
                  <span>{typeLabels[type]}</span>
                  {messageType === type && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={inputRef as any}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="введите текст"
            className="flex-1 px-2 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground resize-none min-h-[76px] pr-14 pb-12"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
        </div>

        {/* Attach file button - top right */}
        <div className="absolute top-2 right-2">
          <input
            type="file"
            id="comment-file-upload"
            className="hidden"
            onChange={handleFileSelect}
            multiple
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => document.getElementById('comment-file-upload')?.click()}
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Send button - bottom right, round */}
        <Button
          type="button"
          size="icon"
          className="absolute bottom-2 right-2 h-10 w-10 rounded-full flex items-center justify-center"
          onClick={handleSubmit}
          disabled={(!message.trim() && files.length === 0) || isSubmitting}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

