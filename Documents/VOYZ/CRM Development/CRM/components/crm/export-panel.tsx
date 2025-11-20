'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ExportPanel() {
  const [dateRange, setDateRange] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')

  const handleExport = (type: string, format: string) => {
    console.log('[v0] Exporting', type, 'as', format, 'with filters:', {
      dateRange,
      statusFilter,
      stageFilter,
    })
    // Mock export action
    alert(`Exporting ${type} as ${format}`)
  }

  return (
    <div className="space-y-6">
      {/* Filter Presets */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Filter Data</h3>
        
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Date Range</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Stage</label>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-9 bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="progress">In Progress</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Closed Won</SelectItem>
                <SelectItem value="lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Export Data</h3>
        
        <div className="space-y-2">
          <Button
            onClick={() => handleExport('deals', 'xlsx')}
            variant="outline"
            className="w-full justify-start h-12 border-border hover:bg-muted/20"
          >
            <FileSpreadsheet className="mr-3 h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Export Deals</p>
              <p className="text-xs text-muted-foreground">Excel format (.xlsx)</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            onClick={() => handleExport('tasks', 'csv')}
            variant="outline"
            className="w-full justify-start h-12 border-border hover:bg-muted/20"
          >
            <FileText className="mr-3 h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Export Tasks</p>
              <p className="text-xs text-muted-foreground">CSV format (.csv)</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            onClick={() => handleExport('all', 'zip')}
            variant="outline"
            className="w-full justify-start h-12 border-border hover:bg-muted/20"
          >
            <Archive className="mr-3 h-5 w-5 text-muted-foreground" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Export All Data</p>
              <p className="text-xs text-muted-foreground">Complete archive (.zip)</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  )
}
