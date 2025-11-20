'use client'

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

const events = [
  { type: 'Deal Created', count: 247, peakHour: '10:00 AM', peakDay: 'Tuesday' },
  { type: 'Stage Changed', count: 512, peakHour: '2:00 PM', peakDay: 'Wednesday' },
  { type: 'Task Created', count: 389, peakHour: '9:00 AM', peakDay: 'Monday' },
  { type: 'Comment Added', count: 1247, peakHour: '3:00 PM', peakDay: 'Thursday' },
  { type: 'Email Sent', count: 892, peakHour: '11:00 AM', peakDay: 'Tuesday' },
]

const distributionData = [
  { hour: '0', value: 12 },
  { hour: '4', value: 8 },
  { hour: '8', value: 45 },
  { hour: '12', value: 78 },
  { hour: '16', value: 92 },
  { hour: '20', value: 34 },
]

export function EventLogging() {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-6">
      <h3 className="mb-6 text-sm font-semibold text-foreground">Event Logging (Aggregated)</h3>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Table */}
        <div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="pb-2 text-left font-medium text-muted-foreground">Event Type</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Count</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Peak Hour</th>
                <th className="pb-2 text-right font-medium text-muted-foreground">Peak Day</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.type}
                  className="border-b border-border/50 transition-colors hover:bg-accent/5"
                >
                  <td className="py-3 text-foreground">{event.type}</td>
                  <td className="py-3 text-right font-medium text-foreground">{event.count}</td>
                  <td className="py-3 text-right text-muted-foreground">{event.peakHour}</td>
                  <td className="py-3 text-right text-muted-foreground">{event.peakDay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Distribution Chart */}
        <div>
          <div className="mb-3 text-xs font-medium text-muted-foreground">
            Event Distribution (24h)
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={distributionData}>
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#71717A', fontSize: 10 }}
                  axisLine={{ stroke: '#27272A' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#71717A', fontSize: 10 }}
                  axisLine={{ stroke: '#27272A' }}
                  tickLine={false}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#A1A1AA"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
