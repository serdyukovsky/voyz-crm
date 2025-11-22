export interface Company {
  id: string
  name: string
  website?: string
  industry?: string
  employees?: number
}

export interface Deal {
  id: string
  name: string
  stage: string
  status: string
  amount: number
  responsibleManager: {
    id: string
    name: string
    avatar?: string
  }
}

export interface Contact {
  id: string
  fullName: string
  email?: string
  phone?: string
  position?: string
  companyName?: string
  companyId?: string
  company?: Company
  tags: string[]
  notes?: string

  social?: {
    instagram?: string
    telegram?: string
    whatsapp?: string
    vk?: string
  }

  createdAt: string
  updatedAt: string

  deals?: Deal[]
  tasks?: Task[]

  stats: {
    activeDeals: number
    closedDeals: number
    totalDeals: number
    totalDealVolume?: number
  }
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done' | 'overdue'
  priority?: 'low' | 'medium' | 'high'
  deadline?: string
  dealId?: string
  contactId?: string
  assignedTo: {
    id: string
    name: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
}

export interface CreateContactDto {
  fullName: string
  email?: string
  phone?: string
  position?: string
  companyName?: string
  companyId?: string
  tags?: string[]
  notes?: string
  social?: {
    instagram?: string
    telegram?: string
    whatsapp?: string
    vk?: string
  }
}

export interface UpdateContactDto extends Partial<CreateContactDto> {}

