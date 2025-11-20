"use client"

import { CRMLayout } from "@/components/crm/layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, MoreVertical } from 'lucide-react'

const users = [
  { id: "1", name: "Alex Chen", email: "alex@pipeline.co", role: "Admin", status: "active", deals: 12 },
  { id: "2", name: "Sarah Lee", email: "sarah@pipeline.co", role: "Sales", status: "active", deals: 8 },
  { id: "3", name: "Mike Johnson", email: "mike@pipeline.co", role: "Sales", status: "active", deals: 15 },
  { id: "4", name: "Emma Wilson", email: "emma@pipeline.co", role: "Manager", status: "active", deals: 6 },
  { id: "5", name: "Chris Park", email: "chris@pipeline.co", role: "Sales", status: "inactive", deals: 3 },
]

export default function UsersPage() {
  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground">Manage team members and permissions</p>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card key={user.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-sm text-primary">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-1 mb-3">
                  <h3 className="text-sm font-medium text-foreground">{user.name}</h3>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-[10px]">
                    {user.role}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] ${
                      user.status === "active" 
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                    }`}
                  >
                    {user.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{user.deals} active deals</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Mail className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CRMLayout>
  )
}
