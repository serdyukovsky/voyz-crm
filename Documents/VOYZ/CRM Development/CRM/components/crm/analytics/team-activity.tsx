'use client'

import { useState } from 'react'

const teamMembers = [
  {
    name: 'Sarah Johnson',
    avatar: 'SJ',
    dealsCreated: 24,
    stageChanges: 87,
    comments: 156,
    tasksCreated: 42,
    tasksCompleted: 38,
    avgResponse: '1.2h',
  },
  {
    name: 'Michael Chen',
    avatar: 'MC',
    dealsCreated: 31,
    stageChanges: 102,
    comments: 203,
    tasksCreated: 56,
    tasksCompleted: 51,
    avgResponse: '0.8h',
  },
  {
    name: 'Emily Rodriguez',
    avatar: 'ER',
    dealsCreated: 19,
    stageChanges: 64,
    comments: 127,
    tasksCreated: 35,
    tasksCompleted: 33,
    avgResponse: '1.5h',
  },
]

const heatmapData = Array.from({ length: 7 }, (_, week) =>
  Array.from({ length: 7 }, (_, day) => ({
    day,
    week,
    value: Math.floor(Math.random() * 20),
  }))
).flat()

export function TeamActivity() {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; week: number } | null>(null)

  const getColorIntensity = (value: number) => {
    if (value === 0) return 'bg-zinc-900'
    if (value < 5) return 'bg-zinc-800'
    if (value < 10) return 'bg-zinc-700'
    if (value < 15) return 'bg-zinc-600'
    return 'bg-zinc-500'
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card p-6">
      <h3 className="mb-6 text-sm font-semibold text-foreground">Team Activity</h3>

      {/* Heatmap */}
      <div className="mb-6">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Activity Heatmap</div>
        <div className="inline-flex gap-1">
          {Array.from({ length: 7 }, (_, week) => (
            <div key={week} className="flex flex-col gap-1">
              {Array.from({ length: 7 }, (_, day) => {
                const cell = heatmapData.find((d) => d.day === day && d.week === week)
                return (
                  <div
                    key={day}
                    className={`h-3 w-3 rounded-sm transition-all ${getColorIntensity(
                      cell?.value || 0
                    )} ${
                      hoveredCell?.day === day && hoveredCell?.week === week
                        ? 'ring-1 ring-primary'
                        : ''
                    }`}
                    onMouseEnter={() => setHoveredCell({ day, week })}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="pb-2 text-left font-medium text-muted-foreground">Employee</th>
              <th className="pb-2 text-right font-medium text-muted-foreground">Deals</th>
              <th className="pb-2 text-right font-medium text-muted-foreground">Changes</th>
              <th className="pb-2 text-right font-medium text-muted-foreground">Comments</th>
              <th className="pb-2 text-right font-medium text-muted-foreground">Created</th>
              <th className="pb-2 text-right font-medium text-muted-foreground">Completed</th>
              <th className="pb-2 text-right font-medium text-muted-foreground">Avg Response</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => (
              <tr
                key={member.name}
                className="border-b border-border/50 transition-colors hover:bg-accent/5"
              >
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                      {member.avatar}
                    </div>
                    <span className="text-foreground">{member.name}</span>
                  </div>
                </td>
                <td className="py-3 text-right font-medium text-foreground">
                  {member.dealsCreated}
                </td>
                <td className="py-3 text-right font-medium text-foreground">
                  {member.stageChanges}
                </td>
                <td className="py-3 text-right font-medium text-foreground">{member.comments}</td>
                <td className="py-3 text-right font-medium text-foreground">
                  {member.tasksCreated}
                </td>
                <td className="py-3 text-right font-medium text-foreground">
                  {member.tasksCompleted}
                </td>
                <td className="py-3 text-right font-medium text-foreground">
                  {member.avgResponse}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
