"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Clock, User as UserIcon, X } from "lucide-react"
import { format } from "date-fns"

interface Deal {
  id: string
  title: string
  client?: string
  amount?: number
  stage?: string
  createdAt?: string
  expectedClose?: string
}

interface DealDetailModalProps {
  deal: Deal | null
  isOpen: boolean
  onClose: () => void
}

export function DealDetailModal({ deal, isOpen, onClose }: DealDetailModalProps) {
  if (!deal) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{deal.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Deal Info */}
          <div className="grid grid-cols-2 gap-4">
            {deal.client && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserIcon className="h-4 w-4" />
                  <span>Client</span>
                </div>
                <div className="text-sm font-medium">{deal.client}</div>
              </div>
            )}

            {deal.amount && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Amount</span>
                </div>
                <div className="text-sm font-medium">
                  ${deal.amount.toLocaleString('en-US')}
                </div>
              </div>
            )}
          </div>

          {deal.stage && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Stage:</span>
              <Badge variant="outline">{deal.stage}</Badge>
            </div>
          )}

          {/* Dates */}
          {(deal.createdAt || deal.expectedClose) && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              {deal.createdAt && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Created</span>
                  </div>
                  <div className="text-sm font-medium">
                    {format(new Date(deal.createdAt), "PPP")}
                  </div>
                </div>
              )}

              {deal.expectedClose && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Expected Close</span>
                  </div>
                  <div className="text-sm font-medium">{deal.expectedClose}</div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

