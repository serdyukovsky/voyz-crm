"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { sendEmail, type SendEmailDto } from '@/lib/api/emails'
import { useToastNotification } from '@/hooks/use-toast-notification'

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  to?: string
  dealId?: string
  contactId?: string
  companyId?: string
  defaultSubject?: string
  defaultText?: string
}

export function SendEmailModal({
  isOpen,
  onClose,
  to: initialTo,
  dealId,
  contactId,
  companyId,
  defaultSubject = '',
  defaultText = '',
}: SendEmailModalProps) {
  const { showSuccess, showError } = useToastNotification()
  const [to, setTo] = useState(initialTo || '')
  const [subject, setSubject] = useState(defaultSubject)
  const [text, setText] = useState(defaultText)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTo(initialTo || '')
      setSubject(defaultSubject)
      setText(defaultText)
    }
  }, [isOpen, initialTo, defaultSubject, defaultText])

  const handleSend = async () => {
    if (!to || !subject || !text) {
      showError('Validation Error', 'Please fill in all required fields')
      return
    }

    try {
      setSending(true)
      const emailData: SendEmailDto = {
        to,
        subject,
        text,
        dealId,
        contactId,
        companyId,
      }

      await sendEmail(emailData)
      showSuccess('Email sent successfully')
      onClose()
      
      // Reset form
      setTo('')
      setSubject('')
      setText('')
    } catch (error) {
      showError('Failed to send email', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            Send an email to {to || 'the recipient'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">To *</Label>
            <Input
              id="to"
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={sending || !!initialTo}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Message *</Label>
            <Textarea
              id="text"
              placeholder="Email message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={sending}
              rows={8}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !to || !subject || !text}>
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}





